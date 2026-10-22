//! 前端资源热更新（无需重新安装应用）。
//!
//! 思路：Tauri 2 把前端内嵌在安装包里、加载地址在编译期固定，无法直接替换。
//! - 更新时把新的前端整包（web.zip）解压到 <app_data>/webapp/<version>
//! - 每次（重新）加载 WebView 前注入一段 DOM 级路由补丁：新页面到达时接管
//!   根节点渲染，任何指向旧内嵌资源的脚本/样式请求都重定向到本地服务（127.0.0.1 随机端口）
//! - 这样行内启动脚本等也会被拦截，页面、懒加载分块、图片全部来自新资源包
//! - 没有资源包、服务启动失败或补丁未生效时，继续使用内置资源，不影响正常使用
//! - 桌面端在启动时直接导航到本地服务地址（更简单直接）

use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;

use tauri::{Manager, Runtime};

static SERVER_PORT: OnceLock<u16> = OnceLock::new();
static SERVER_STARTED: AtomicBool = AtomicBool::new(false);

/// 当前资源包目录（有热更新时才有值）
static BUNDLE_ROOT: OnceLock<PathBuf> = OnceLock::new();

/// 热更新目录：<app_data>/webapp/<version>
pub fn bundle_dir<R: Runtime, M: Manager<R>>(manager: &M, version: &str) -> Result<PathBuf, String> {
    let safe: String = version
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
        .collect();
    manager
        .path()
        .app_data_dir()
        .map(|dir| {
            dir.join("webapp")
                .join(if safe.is_empty() { "latest".to_string() } else { safe })
        })
        .map_err(|e| format!("获取资源目录失败: {e}"))
}

fn is_valid_bundle(dir: &Path) -> bool {
    dir.join("index.html").is_file()
}

fn compare_version(a: &str, b: &str) -> std::cmp::Ordering {
    let parse = |s: &str| -> Vec<u64> {
        s.split(|c| c == '.' || c == '-')
            .map(|part| part.parse::<u64>().unwrap_or(0))
            .collect()
    };
    let (pa, pb) = (parse(a), parse(b));
    for i in 0..3 {
        let x = pa.get(i).copied().unwrap_or(0);
        let y = pb.get(i).copied().unwrap_or(0);
        if x != y {
            return x.cmp(&y);
        }
    }
    std::cmp::Ordering::Equal
}

/// 查找本地已下载并校验通过的最新资源包（启动时调用）
pub fn find_active_bundle<R: Runtime, M: Manager<R>>(manager: &M) -> Option<PathBuf> {
    let root = manager.path().app_data_dir().ok()?.join("webapp");
    if !root.is_dir() {
        return None;
    }
    let mut versions: Vec<String> = std::fs::read_dir(&root)
        .ok()?
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.path().is_dir())
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect();
    versions.sort_by(|a, b| compare_version(b, a));
    versions
        .into_iter()
        .map(|v| root.join(&v))
        .find(|dir| is_valid_bundle(dir))
}

/// 纯文件逻辑：解压、校验、替换为正式目录。与 tauri 无关，独立测试直接复用。
pub fn install_bundle(bytes: &[u8], target: &Path) -> Result<(), String> {
    if bytes.is_empty() {
        return Err("更新包为空".into());
    }
    let Some(staging) = target.parent().map(|parent| {
        parent.join(format!("{}-staging", target.file_name().and_then(|n| n.to_str()).unwrap_or("bundle")))
    }) else {
        return Err("资源目录无效".into());
    };
    let _ = std::fs::remove_dir_all(&staging);
    extract_zip(bytes, &staging)?;

    // 有些打包工具会把文件放在 web/ 子目录里，这里统一拍平
    let staged_root = if staging.join("index.html").is_file() {
        staging.clone()
    } else if staging.join("web").join("index.html").is_file() {
        staging.join("web")
    } else {
        let _ = std::fs::remove_dir_all(&staging);
        return Err("更新包缺少 index.html".into());
    };

    if target.exists() {
        std::fs::remove_dir_all(target).map_err(|e| format!("清理旧版本失败: {e}"))?;
    }
    std::fs::rename(&staged_root, target).map_err(|e| format!("安装更新失败: {e}"))?;
    if staged_root != staging {
        let _ = std::fs::remove_dir_all(&staging);
    }
    prune_old_bundles(target);
    Ok(())
}

fn extract_zip(bytes: &[u8], dest: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dest).map_err(|e| format!("创建目录失败: {e}"))?;
    let cursor = std::io::Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|e| format!("更新包损坏: {e}"))?;
    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("读取更新包失败: {e}"))?;
        let Some(rel) = file.enclosed_name() else {
            return Err("更新包包含非法路径".into());
        };
        let out_path = dest.join(rel);
        if file.is_dir() {
            std::fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
            continue;
        }
        if let Some(parent) = out_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut out = std::fs::File::create(&out_path).map_err(|e| e.to_string())?;
        std::io::copy(&mut file, &mut out).map_err(|e| format!("写入文件失败: {e}"))?;
    }
    Ok(())
}

/// 解压前端资源包到 <app_data>/webapp/<version>，校验后返回目录
#[tauri::command]
pub async fn apply_web_bundle<R: Runtime>(
    app: tauri::AppHandle<R>,
    bytes: Vec<u8>,
    version: String,
) -> Result<String, String> {
    let target = bundle_dir(&app, &version)?;
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {e}"))?;
    }
    install_bundle(&bytes, &target)?;
    Ok(target.to_string_lossy().to_string())
}

/// 删除除 keep 以外的旧资源包
pub fn prune_old_bundles(keep: &Path) {
    let Some(root) = keep.parent() else { return };
    let Ok(entries) = std::fs::read_dir(root) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        if path != keep && entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            let _ = std::fs::remove_dir_all(path);
        }
    }
}

const MIME_TABLE: &[(&str, &str)] = &[
    ("html", "text/html; charset=utf-8"),
    ("js", "text/javascript; charset=utf-8"),
    ("mjs", "text/javascript; charset=utf-8"),
    ("css", "text/css; charset=utf-8"),
    ("json", "application/json; charset=utf-8"),
    ("svg", "image/svg+xml"),
    ("png", "image/png"),
    ("jpg", "image/jpeg"),
    ("jpeg", "image/jpeg"),
    ("webp", "image/webp"),
    ("ico", "image/x-icon"),
    ("woff", "font/woff"),
    ("woff2", "font/woff2"),
    ("ttf", "font/ttf"),
    ("map", "application/json"),
    ("txt", "text/plain; charset=utf-8"),
];

fn mime_for(path: &Path) -> &'static str {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    MIME_TABLE
        .iter()
        .find(|(k, _)| *k == ext)
        .map(|(_, v)| *v)
        .unwrap_or("application/octet-stream")
}

fn resolve_request_path(root: &Path, raw_path: &str) -> Option<PathBuf> {
    let without_query = raw_path.split(['?', '#']).next().unwrap_or("/");
    let decoded = urldecode(without_query);
    let relative = decoded.trim_start_matches('/');
    if relative.contains("..") {
        return None;
    }
    let candidate = if relative.is_empty() {
        root.join("index.html")
    } else {
        root.join(relative)
    };
    if candidate.is_file() {
        return Some(candidate);
    }
    // 前端单页路由：没有扩展名的路径统一返回 index.html
    if !relative.contains('.') {
        let fallback = root.join("index.html");
        if fallback.is_file() {
            return Some(fallback);
        }
    }
    None
}

fn urldecode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(value) = u8::from_str_radix(&input[i + 1..i + 3], 16) {
                out.push(value);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}

fn handle_connection(stream: std::net::TcpStream, root: PathBuf) {
    let mut reader = BufReader::new(match stream.try_clone() {
        Ok(s) => s,
        Err(_) => return,
    });
    let mut writer = stream;

    let mut request_line = String::new();
    if reader.read_line(&mut request_line).is_err() {
        return;
    }
    // 读完请求头，忽略内容
    let mut header = String::new();
    while reader.read_line(&mut header).map(|n| n > 2).unwrap_or(false) {}

    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let path = parts.next().unwrap_or("/");

    if method != "GET" && method != "HEAD" {
        let _ = writer.write_all(b"HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n");
        return;
    }

    let Some(file_path) = resolve_request_path(&root, path) else {
        let _ = writer.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
        return;
    };

    let mut file = match std::fs::File::open(&file_path) {
        Ok(f) => f,
        Err(_) => {
            let _ = writer.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
            return;
        }
    };
    let mut body = Vec::new();
    if file.read_to_end(&mut body).is_err() {
        return;
    }
    let mime = mime_for(&file_path);
    let header = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: {mime}\r\nContent-Length: {}\r\nCache-Control: no-cache\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n",
        body.len()
    );
    let _ = writer.write_all(header.as_bytes());
    if method == "GET" {
        let _ = writer.write_all(&body);
    }
    let _ = writer.flush();
}

/// 启动本地静态服务，返回访问地址；失败返回 None
pub fn start_server(root: PathBuf) -> Option<String> {
    if SERVER_STARTED.swap(true, Ordering::SeqCst) {
        return SERVER_PORT.get().map(|port| format!("http://127.0.0.1:{port}/index.html"));
    }
    let listener = TcpListener::bind("127.0.0.1:0").ok()?;
    let port = listener.local_addr().ok()?.port();
    let _ = SERVER_PORT.set(port);

    let shared_root = root.clone();
    std::thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let root = shared_root.clone();
            std::thread::spawn(move || handle_connection(stream, root));
        }
    });
    Some(format!("http://127.0.0.1:{port}/index.html"))
}


/// 页面路由补丁：注入到每个加载的 HTML 最前面（安卓端 wry 会插到 head 开头）。
/// 原页面解析完成、入口脚本执行前接管 #root，并把脚本/样式请求重定向到本地服务。
const PAGE_ROUTER_JS: &str = r#"
(function () {
  var service = __SERVICE__;
  if (!service || window.__mengchuWebUpdate) return;
  window.__mengchuWebUpdate = true;

  function rewriteUrl(url) {
    if (!url) return url;
    if (/^(https?:|data:|blob:|tauri:)/i.test(url)) return url;
    return service + '/' + String(url).replace(/^\.?\//, '');
  }

  function rewriteElement(el) {
    var attr = el.tagName.toLowerCase() === 'link' ? 'href' : 'src';
    var value = el.getAttribute(attr);
    if (!value) return;
    var next = rewriteUrl(value);
    if (next !== value) el.setAttribute(attr, next);
  }

  function isLoader(el) {
    var tag = el.tagName.toLowerCase();
    if (tag === 'script') return true;
    if (tag === 'link') {
      var rel = (el.getAttribute('rel') || '').toLowerCase();
      return rel === 'stylesheet' || rel === 'modulepreload' || rel === 'preload';
    }
    return false;
  }

  function swap() {
    var root = document.getElementById('root');
    if (!root) return;
    var entries = [];
    var nodes = document.querySelectorAll('script, link');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el.getAttribute('src') && !el.getAttribute('href')) continue;
      if (!isLoader(el)) continue;
      if (el.tagName.toLowerCase() === 'script') entries.push(el.getAttribute('src'));
      rewriteElement(el);
    }
    if (!entries.length) return;
    root.textContent = '';
    window.__mengchuWebUpdated = true;
    entries.forEach(function (src, index) {
      var script = document.createElement('script');
      script.type = 'module';
      script.crossOrigin = '';
      script.src = rewriteUrl(src);
      script.onerror = function () {
        // 新资源加载失败：提示用户，而不是白屏
        if (root && !root.firstChild && index === 0) {
          root.innerHTML = '<div style="padding:40px 16px;text-align:center;font:13px sans-serif;color:#9A8C82">' +
            '更新资源加载失败，请检查网络后重启 App。</div>';
        }
      };
      document.head.appendChild(script);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', swap);
  } else {
    swap();
  }
})();
"#;

/// 把服务地址填进补丁脚本
pub fn page_router_script(service: &str) -> String {
    PAGE_ROUTER_JS.replace(
        "__SERVICE__",
        &serde_json::to_string(service.trim_end_matches('/')).unwrap_or_else(|_| "''".into()),
    )
}

/// 注册补丁插件：在页面加载完成后执行补丁（初始化脚本注入时机在部分平台上早于端口就绪，这里统一由 on_page_load 触发）
pub fn plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("mengchu-web-update")
        .on_page_load(|webview, payload| {
            if payload.event() != tauri::webview::PageLoadEvent::Finished {
                return;
            }
            let Some(port) = SERVER_PORT.get() else { return };
            if BUNDLE_ROOT.get().is_none() {
                return;
            }
            let script = page_router_script(&format!("http://127.0.0.1:{port}"));
            let _ = webview.eval(script);
        })
        .build()
}

/// 启动时：有可用的热更新资源就起服务并返回地址
pub fn activate_on_startup<R: Runtime>(app: &tauri::AppHandle<R>) -> Option<String> {
    let bundle = find_active_bundle(app)?;
    let url = start_server(bundle.clone());
    if url.is_some() {
        let _ = BUNDLE_ROOT.set(bundle.clone());
        log::info!("[web-update] 使用热更新资源: {}", bundle.display());
    }
    url
}

/// 前端调用：更新已安装，重新加载即可生效
#[tauri::command]
pub async fn reload_app() -> Result<(), String> {
    // 前端在调用后自行刷新；安卓端刷新走 isReload 标记
    Ok(())
}
