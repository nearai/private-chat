use once_cell::sync::OnceCell;
use serde::Serialize;
use std::error::Error;
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
  </head>
  <body>
    <div class="card">
      <h1>You're signed in</h1>
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

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct DesktopOAuthPayload {
  token: Option<String>,
  session_id: Option<String>,
  is_new_user: bool,
  oauth_channel: Option<String>,
}

static OAUTH_SERVER: OnceCell<OAuthServerHandle> = OnceCell::new();

pub fn ensure_oauth_server(app: AppHandle) -> Result<String, Box<dyn Error + Send + Sync>> {
  let handle = OAUTH_SERVER.get_or_try_init(|| -> Result<OAuthServerHandle, Box<dyn Error + Send + Sync>> {
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
  })?;

  Ok(format!("http://127.0.0.1:{}/oauth/callback", handle.port))
}

fn handle_request(app: &AppHandle, request: Request) {
  if let Err(err) = handle_request_inner(app, request) {
    eprintln!("OAuth callback handling failed: {}", err);
  }
}

fn handle_request_inner(app: &AppHandle, request: Request) -> Result<(), String> {
  let method = request.method().as_str().to_string();
  if method != "GET" {
    let _ = request.respond(Response::empty(405));
    return Err("Invalid method".into());
  }

  let full_url = format!("http://localhost{}", request.url());
  let parsed_url = match Url::parse(&full_url) {
    Ok(url) => url,
    Err(err) => {
      let _ = request.respond(
        Response::from_string(ERROR_HTML)
          .with_status_code(StatusCode(400))
          .with_header(Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap()),
      );
      return Err(format!("Failed to parse callback url: {}", err));
    }
  };

  let path = parsed_url.path();
  if !path.starts_with("/oauth/callback") {
    let _ = request.respond(Response::empty(404));
    return Err(format!("Unknown path: {}", path));
  }

  let mut token: Option<String> = None;
  let mut session_id: Option<String> = None;
  let mut oauth_channel: Option<String> = None;
  let mut is_new_user = false;

  for (key, value) in parsed_url.query_pairs() {
    match key.as_ref() {
      "token" => token = Some(value.to_string()),
      "session_id" => session_id = Some(value.to_string()),
      "oauth_channel" => oauth_channel = Some(value.to_string()),
      "is_new_user" => {
        is_new_user = matches!(value.as_ref(), "true" | "1" | "yes");
      }
      _ => {}
    }
  }

  if token.is_none() || session_id.is_none() {
    let _ = request.respond(
      Response::from_string(ERROR_HTML)
        .with_status_code(StatusCode(400))
        .with_header(Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap()),
    );
    return Err("Missing auth payload".into());
  }

  let payload = DesktopOAuthPayload {
    token,
    session_id,
    is_new_user,
    oauth_channel,
  };

  let _ = app.emit("desktop://oauth-complete", payload);

  let _ = request.respond(
    Response::from_string(SUCCESS_HTML)
      .with_status_code(StatusCode(200))
      .with_header(Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap()),
  );
  Ok(())
}
