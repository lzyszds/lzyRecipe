mod apk_installer;
mod cover_api;
mod net;
mod web_update;

use apk_installer::install_apk_from_bytes;
use cover_api::{generate_cover_baidu, search_cover_baidu_images, search_cover_bing};
use net::{http_request, speech_to_text};
use web_update::{apply_web_bundle, reload_app};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(web_update::plugin())
        .invoke_handler(tauri::generate_handler![
            generate_cover_baidu,
            search_cover_bing,
            search_cover_baidu_images,
            http_request,
            speech_to_text,
            install_apk_from_bytes,
            apply_web_bundle,
            reload_app
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 桌面端：有热更新资源时，主窗口改为从本地服务加载，无需重新安装即可升级前端
            #[cfg(desktop)]
            {
                use tauri::Manager;
                if let Some(url) = web_update::activate_on_startup(app.handle()) {
                    if let Ok(parsed) = url.parse() {
                        if let Some(window) = app.get_webview_window("main") {
                            window.navigate(parsed)?;
                        }
                    }
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
