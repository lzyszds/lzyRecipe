//! 通用 HTTP 透传：桌面/安卓端用 Rust reqwest 发请求，避开 WebView 的 CORS 限制，
//! 同步、AI、语音识别都走这里；浏览器预览时前端会退化为直接 fetch。

use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Deserialize)]
pub struct HttpRequest {
    pub url: String,
    #[serde(default)]
    pub method: Option<String>,
    #[serde(default)]
    pub headers: Option<Vec<(String, String)>>,
    #[serde(default)]
    pub body: Option<String>,
    /// body 是否为 base64（用于上传音频、图片等二进制内容）
    #[serde(default)]
    pub body_base64: Option<bool>,
    #[serde(default)]
    pub timeout_secs: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    /// 响应体 base64，二进制也能原样带回前端
    pub body_base64: String,
}

#[tauri::command]
pub async fn http_request(request: HttpRequest) -> Result<HttpResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(request.timeout_secs.unwrap_or(60)))
        .user_agent("MengChuShiGuang/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let method = reqwest::Method::from_bytes(
        request.method.as_deref().unwrap_or("GET").to_uppercase().as_bytes(),
    )
    .map_err(|e| format!("无效的请求方法: {e}"))?;

    let mut builder = client.request(method, &request.url);

    if let Some(headers) = &request.headers {
        for (key, value) in headers {
            builder = builder.header(key, value);
        }
    }

    if let Some(body) = request.body {
        if request.body_base64.unwrap_or(false) {
            let bytes = general_purpose::STANDARD
                .decode(body.as_bytes())
                .map_err(|e| format!("请求体解码失败: {e}"))?;
            builder = builder.body(bytes);
        } else {
            builder = builder.body(body);
        }
    }

    let resp = builder
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {e}"))?;

    let status = resp.status().as_u16();
    let headers = resp
        .headers()
        .iter()
        .filter_map(|(k, v)| v.to_str().ok().map(|v| (k.to_string(), v.to_string())))
        .collect();
    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("读取响应失败: {e}"))?;

    Ok(HttpResponse {
        status,
        headers,
        body_base64: general_purpose::STANDARD.encode(&bytes),
    })
}

const CRLF: &str = "\r\n";

/// 语音转文字：把录音文件发到 OpenAI 兼容的 `/audio/transcriptions` 接口。
/// 手写 multipart，避免引入 reqwest 的 multipart feature（需要额外依赖）。
#[tauri::command]
pub async fn speech_to_text(
    audio_base64: String,
    mime: String,
    file_name: String,
    endpoint: String,
    api_key: String,
    model: String,
    language: Option<String>,
) -> Result<String, String> {
    let audio = general_purpose::STANDARD
        .decode(audio_base64.as_bytes())
        .map_err(|e| format!("音频解码失败: {e}"))?;

    let boundary = format!(
        "----mengchu{:x}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0)
    );

    let mut body: Vec<u8> = Vec::new();
    let mut push_field = |name: &str, value: &str| {
        body.extend_from_slice(format!("--{boundary}{CRLF}").as_bytes());
        body.extend_from_slice(
            format!("Content-Disposition: form-data; name=\"{name}\"{CRLF}{CRLF}").as_bytes(),
        );
        body.extend_from_slice(value.as_bytes());
        body.extend_from_slice(CRLF.as_bytes());
    };

    push_field("model", &model);
    if let Some(lang) = language.as_deref().filter(|l| !l.trim().is_empty()) {
        push_field("language", lang);
    }

    body.extend_from_slice(format!("--{boundary}{CRLF}").as_bytes());
    body.extend_from_slice(
        format!(
            "Content-Disposition: form-data; name=\"file\"; filename=\"{file_name}\"{CRLF}"
        )
        .as_bytes(),
    );
    body.extend_from_slice(format!("Content-Type: {mime}{CRLF}{CRLF}").as_bytes());
    body.extend_from_slice(&audio);
    body.extend_from_slice(CRLF.as_bytes());
    body.extend_from_slice(format!("--{boundary}--{CRLF}").as_bytes());

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .post(&endpoint)
        .bearer_auth(&api_key)
        .header(
            "Content-Type",
            format!("multipart/form-data; boundary={boundary}"),
        )
        .body(body)
        .send()
        .await
        .map_err(|e| format!("语音识别请求失败: {e}"))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("读取识别结果失败: {e}"))?;

    if !status.is_success() {
        return Err(format!("语音识别失败（{status}）：{text}"));
    }

    #[derive(Deserialize)]
    struct TranscriptionResponse {
        text: Option<String>,
    }

    let parsed: TranscriptionResponse =
        serde_json::from_str(&text).map_err(|e| format!("解析识别结果失败: {e}"))?;
    parsed
        .text
        .filter(|t| !t.trim().is_empty())
        .ok_or_else(|| "没有识别到语音内容".to_string())
}
