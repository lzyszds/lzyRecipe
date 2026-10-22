//! 应用内更新：前端下载好 APK 后把字节传进来，写入应用缓存目录并拉起系统安装界面。

#[tauri::command]
pub async fn install_apk_from_bytes(
    app: tauri::AppHandle,
    bytes: Vec<u8>,
    file_name: String,
) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        use tauri::Manager;
        if bytes.len() < 1024 {
            return Err("安装包内容为空，请重新下载".into());
        }
        let dir = app
            .path()
            .app_cache_dir()
            .map_err(|e| format!("获取缓存目录失败: {e}"))?;
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

        let safe_name = file_name
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
            .collect::<String>();
        let path = dir.join(if safe_name.is_empty() {
            "update.apk".to_string()
        } else {
            safe_name
        });
        std::fs::write(&path, &bytes).map_err(|e| format!("写入安装包失败: {e}"))?;

        use tauri_plugin_opener::OpenerExt;
        app.opener()
            .open_path(path.to_string_lossy().to_string(), None::<&str>)
            .map_err(|e| format!("打开安装界面失败: {e}"))?;
        Ok(())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, bytes, file_name);
        Err("桌面端请直接运行下载好的安装包".into())
    }
}
