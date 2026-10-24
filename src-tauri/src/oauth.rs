use once_cell::sync::OnceCell;
use serde::Serialize;
use std::error::Error;
use std::io::Read;
use std::thread;
use tauri::{AppHandle, Emitter};
use tiny_http::{Header, ListenAddr, Request, Response, Server, StatusCode};
use url::Url;

const SUCCESS_HTML: &str = r#"<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>NEAR AI</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #060606; color: #f3f3f3; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
      .card { background: #141414; padding: 32px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); max-width: 420px; text-align: center; }
      h1 { font-size: 24px; margin-bottom: 12px; }
      p { color: #9ca3af; font-size: 15px; line-height: 1.4; }
    </style>
  <meta name="referrer" content="no-referrer" />
    <script>history.replaceState(null, "", "/oauth/complete");</script>
  </head>
  <body>
    <div class="card">
      <h1>Return to NEAR AI</h1>
      <p>You can close this tab and return to NEAR AI.</p>
    </div>
  </body>
</html>
"#;

const ERROR_HTML: &str = r#"<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>NEAR AI</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #060606; color: #f3f3f3; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
      .card { background: #141414; padding: 32px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); max-width: 420px; text-align: center; }
      h1 { font-size: 24px; margin-bottom: 12px; color: #f87171; }
      p { color: #9ca3af; font-size: 15px; line-height: 1.4; }
    </style>
  <meta name="referrer" content="no-referrer" />
    <script>history.replaceState(null, "", "/oauth/complete");</script>
  </head>
  <body>
    <div class="card">
      <h1>Something went wrong</h1>
      <p>We were unable to complete the sign-in. Please return to NEAR AI and try again.</p>
    </div>
  </body>
</html>
"#;

#[derive(Clone)]
struct OAuthServerHandle {
    port: u16,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DesktopOAuthPayload {
    token: Option<String>,
    session_id: Option<String>,
    is_new_user: bool,
    code: Option<String>,
    state: Option<String>,
}

static OAUTH_SERVER: OnceCell<OAuthServerHandle> = OnceCell::new();

pub fn ensure_oauth_server(app: AppHandle) -> Result<String, Box<dyn Error + Send + Sync>> {
    let handle = OAUTH_SERVER.get_or_try_init(
        || -> Result<OAuthServerHandle, Box<dyn Error + Send + Sync>> {
            let server = Server::http(("127.0.0.1", 0))?;
            let port = match server.server_addr() {
                ListenAddr::IP(addr) => addr.port(),
                _ => 0,
            };
            let app_handle = app.clone();
            thread::spawn(move || {
                for request in server.incoming_requests() {
                    handle_request(&app_handle, request);
                }
            });

            Ok(OAuthServerHandle { port })
        },
    )?;

    Ok(format!("http://127.0.0.1:{}/oauth/callback", handle.port))
}

fn handle_request(app: &AppHandle, request: Request) {
    if let Err(err) = handle_request_inner(app, request) {
        eprintln!("OAuth callback handling failed: {}", err);
    }
}

fn parse_payload(
    method: &str,
    path: &str,
    query: &str,
    body: &str,
) -> Result<DesktopOAuthPayload, String> {
    if !matches!(path, "/oauth/callback" | "/oauth/callback/auth/callback") {
        return Err("Unknown callback path".into());
    }
    let encoded = match method {
        "GET" => query,
        "POST" if path == "/oauth/callback" && query.is_empty() => body,
        _ => return Err("Invalid callback method".into()),
    };
    let mut values = std::collections::HashMap::new();
    for (key, value) in url::form_urlencoded::parse(encoded.as_bytes()) {
        if values
            .insert(key.into_owned(), value.into_owned())
            .is_some()
        {
            return Err("Duplicate callback parameter".into());
        }
    }
    let state = values.remove("state");
    if state.as_ref().is_some_and(|s| {
        s.len() != 43
            || !s
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
    }) {
        return Err("Invalid callback state".into());
    }
    let has_code = values.contains_key("code");
    let has_token = values.contains_key("token");
    let has_session = values.contains_key("session_id");
    let code = values.remove("code").filter(|s| !s.is_empty());
    let token = values.remove("token").filter(|s| !s.is_empty());
    let session_id = values.remove("session_id").filter(|s| !s.is_empty());
    let is_new_user = matches!(values.remove("is_new_user").as_deref(), Some("true"));
    if !values.is_empty() {
        return Err("Unexpected callback parameter".into());
    }
    match method {
        "GET" if code.is_some() && state.is_some() && !has_token && !has_session => {}
        "POST" if !has_code && token.is_some() && session_id.is_some() && state.is_some() => {}
        _ => return Err("Invalid callback payload".into()),
    }
    Ok(DesktopOAuthPayload {
        token,
        session_id,
        is_new_user,
        code,
        state,
    })
}

fn handle_request_inner(app: &AppHandle, mut request: Request) -> Result<(), String> {
    let method = request.method().as_str().to_string();
    let parsed = Url::parse(&format!("http://localhost{}", request.url()))
        .map_err(|_| "Invalid callback URL")?;
    let mut body = String::new();
    if method == "POST" {
        let is_form = request.headers().iter().any(|header| {
            header.field.equiv("Content-Type")
                && header.value.as_str().split(';').next()
                    == Some("application/x-www-form-urlencoded")
        });
        if !is_form {
            let _ = request.respond(Response::empty(415));
            return Err("Invalid callback content type".into());
        }
        const MAX_BODY: u64 = 16 * 1024;
        let read_result = request
            .as_reader()
            .take(MAX_BODY + 1)
            .read_to_string(&mut body);
        if read_result.is_err() || body.len() as u64 > MAX_BODY {
            let _ = request.respond(Response::empty(413));
            return Err("Invalid callback body".into());
        }
    }
    let payload = parse_payload(&method, parsed.path(), parsed.query().unwrap_or(""), &body);
    let result = payload.and_then(|payload| {
        app.emit("desktop://oauth-complete", payload)
            .map_err(|_| "Callback delivery failed".into())
    });
    let response = Response::from_string(if result.is_ok() {
        SUCCESS_HTML
    } else {
        ERROR_HTML
    })
    .with_status_code(StatusCode(if result.is_ok() { 200 } else { 400 }))
    .with_header(Header::from_bytes("Content-Type", "text/html; charset=utf-8").unwrap())
    .with_header(Header::from_bytes("Cache-Control", "no-store").unwrap())
    .with_header(Header::from_bytes("Referrer-Policy", "no-referrer").unwrap());
    let _ = request.respond(response);
    result
}

#[cfg(test)]
mod tests {
    use super::parse_payload;

    fn state() -> String {
        "A".repeat(43)
    }

    #[test]
    fn accepts_code_handoff_at_both_backend_callback_paths() {
        for path in ["/oauth/callback", "/oauth/callback/auth/callback"] {
            let payload =
                parse_payload("GET", path, &format!("code=one-time&state={}", state()), "")
                    .unwrap();
            assert_eq!(payload.code.as_deref(), Some("one-time"));
            assert!(payload.token.is_none());
        }
    }

    #[test]
    fn near_bearer_requires_state_bound_post() {
        let body = format!(
            "token=sess%2Bsecret&session_id=id&is_new_user=true&state={}",
            state()
        );
        let payload = parse_payload("POST", "/oauth/callback", "", &body).unwrap();
        assert_eq!(payload.token.as_deref(), Some("sess+secret"));
        assert_eq!(payload.session_id.as_deref(), Some("id"));
        assert_eq!(payload.state, Some(state()));
        assert!(payload.is_new_user);
        assert!(parse_payload("GET", "/oauth/callback", &body, "").is_err());
        assert!(parse_payload("POST", "/oauth/callback", &body, "").is_err());
    }

    #[test]
    fn rejects_mixed_duplicate_missing_and_wrong_route_payloads() {
        for query in [
            format!("code=c&token=t&state={}", state()),
            format!("code=c&session_id=id&state={}", state()),
            format!("code=c&state={}&state={}", state(), state()),
            format!("code=c&token=&state={}", state()),
            "code=c".into(),
            "code=c&state=bad".into(),
        ] {
            assert!(parse_payload("GET", "/oauth/callback", &query, "").is_err());
        }
        assert!(parse_payload(
            "GET",
            "/oauth/callback/other",
            &format!("code=c&state={}", state()),
            ""
        )
        .is_err());
        assert!(parse_payload(
            "POST",
            "/oauth/callback",
            "",
            &format!("code=c&state={}", state())
        )
        .is_err());
    }
    #[test]
    fn rejects_bearer_get_with_or_without_state_at_both_paths() {
        for path in ["/oauth/callback", "/oauth/callback/auth/callback"] {
            for query in [
                "token=sess_secret".to_string(),
                "token=sess_secret&session_id=id&expires_at=2026-11-01".to_string(),
                format!("token=sess_secret&session_id=id&state={}", state()),
                format!("%74oken=sess_secret&state={}", state()),
            ] {
                assert!(parse_payload("GET", path, &query, "").is_err());
            }
        }
    }

    #[test]
    fn code_and_post_require_state_and_unambiguous_credentials() {
        assert!(parse_payload("GET", "/oauth/callback", "code=one-time", "").is_err());
        assert!(parse_payload(
            "POST",
            "/oauth/callback",
            "",
            "token=sess_secret&session_id=id"
        )
        .is_err());
        assert!(parse_payload(
            "GET",
            "/oauth/callback",
            "token=sess_secret&token=other",
            ""
        )
        .is_err());
        assert!(parse_payload(
            "GET",
            "/oauth/callback",
            "token=sess_secret&state=wrong",
            ""
        )
        .is_err());
    }
}
