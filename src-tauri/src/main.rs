#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu};

fn build_tray() -> SystemTray {
  let show = CustomMenuItem::new("show".to_string(), "Show");
  let hide = CustomMenuItem::new("hide".to_string(), "Hide");
  let quit = CustomMenuItem::new("quit".to_string(), "Quit");

  let tray_menu = SystemTrayMenu::new()
    .add_item(show)
    .add_item(hide)
    .add_item(quit);

  SystemTray::new().with_menu(tray_menu)
}

fn main() {
  let tray = build_tray();

  tauri::Builder::default()
    .system_tray(tray)
    .on_system_tray_event(|app, event| match event {
      SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
        "show" => {
          if let Some(window) = app.get_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
          }
        }
        "hide" => {
          if let Some(window) = app.get_window("main") {
            let _ = window.hide();
          }
        }
        "quit" => {
          app.exit(0);
        }
        _ => {}
      },
      SystemTrayEvent::LeftClick { .. } => {
        if let Some(window) = app.get_window("main") {
          let _ = window.show();
          let _ = window.set_focus();
        }
      }
      _ => {}
    })
    .setup(|app| {
      if let Some(window) = app.get_window("main") {
        let _ = window.show();
      }

      let identifier = app.config().tauri.bundle.identifier.clone();
      let _ = tauri::api::notification::Notification::new(identifier)
        .title("Private Chat")
        .body("Private Chat is running in the background.")
        .show();

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
