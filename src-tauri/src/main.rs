#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::MenuBuilder,
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri_plugin_notification::NotificationExt;

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let tray_menu = MenuBuilder::new(app)
        .text("show", "Show")
        .text("hide", "Hide")
        .text("quit", "Quit")
        .build()?;

    let mut tray = TrayIconBuilder::with_id("main")
        .menu(&tray_menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray_icon, event| {
            if let TrayIconEvent::Click { .. } = event {
                if let Some(window) = tray_icon.app_handle().get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        tray = tray.icon(icon);
    }

    tray.build(app)?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            build_tray(&app.handle())?;

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }

            let _ = app
                .notification()
                .builder()
                .title("Private Chat")
                .body("Private Chat is running in the background.")
                .show();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
