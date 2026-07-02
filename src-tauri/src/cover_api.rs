use base64::{engine::general_purpose, Engine as _};
use serde::Deserialize;
use serde_json::json;
use std::time::Duration;

const USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BAIDU_REFERER: &str = "https://image.baidu.com/";

async fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .user_agent(USER_AGENT)
        .gzip(true)
        .build()
        .map_err(|e| e.to_string())
}

fn baidu_search_headers(builder: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
    builder
        .header("Referer", BAIDU_REFERER)
        .header("Accept", "application/json, text/plain, */*")
        .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
}

async fn baidu_access_token(
    client: &reqwest::Client,
    api_key: &str,
    secret_key: &str,
) -> Result<String, String> {
    let url = format!(
        "https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={api_key}&client_secret={secret_key}"
    );

    let resp: serde_json::Value = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("获取百度 token 失败: {e}"))?
        .json()
        .await
        .map_err(|e| format!("解析百度 token 失败: {e}"))?;

    if let Some(err) = resp.get("error_description").and_then(|v| v.as_str()) {
        return Err(format!("百度鉴权失败: {err}"));
    }

    resp["access_token"]
        .as_str()
        .map(String::from)
        .ok_or_else(|| "百度返回的 access_token 无效".into())
}

fn build_food_prompt(recipe_name: &str, category: &str) -> String {
    format!(
        "{recipe_name}，{category}，中式家常菜，精美摆盘，食物摄影，高清细节，诱人色泽"
    )
}

#[derive(Deserialize)]
struct BaiduSubmitData {
    #[serde(rename = "taskId")]
    task_id: Option<String>,
}

#[derive(Deserialize)]
struct BaiduSubmitResponse {
    data: Option<BaiduSubmitData>,
    error_msg: Option<String>,
    error_code: Option<i64>,
}

#[derive(Deserialize)]
struct BaiduGetImgData {
    status: Option<i64>,
    img: Option<String>,
}

#[derive(Deserialize)]
struct BaiduGetImgResponse {
    data: Option<BaiduGetImgData>,
    error_msg: Option<String>,
    error_code: Option<i64>,
}

async fn baidu_poll_image(
    client: &reqwest::Client,
    token: &str,
    task_id: &str,
) -> Result<String, String> {
    let get_url = format!(
        "https://aip.baidubce.com/rpc/2.0/wenxin/v1/basic/getImg?access_token={token}"
    );

    for _ in 0..40 {
        tokio::time::sleep(Duration::from_secs(2)).await;

        let resp: BaiduGetImgResponse = client
            .post(&get_url)
            .json(&json!({ "taskId": task_id }))
            .send()
            .await
            .map_err(|e| format!("查询百度生图结果失败: {e}"))?
            .json()
            .await
            .map_err(|e| format!("解析百度生图结果失败: {e}"))?;

        if let Some(code) = resp.error_code {
            if code != 0 {
                return Err(resp
                    .error_msg
                    .unwrap_or_else(|| format!("百度生图错误 code={code}")));
            }
        }

        if let Some(data) = resp.data {
            if let Some(status) = data.status {
                if status == 1 {
                    if let Some(img) = data.img {
                        return Ok(img);
                    }
                }
                if status == 2 {
                    return Err("百度生图任务失败".into());
                }
            }
        }
    }

    Err("百度生图超时，请稍后重试".into())
}

async fn download_as_data_url(client: &reqwest::Client, url: &str) -> Result<String, String> {
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("下载图片失败: {e}"))?;

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("读取图片失败: {e}"))?;

    let mime = content_type.split(';').next().unwrap_or("image/jpeg");
    let b64 = general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{mime};base64,{b64}"))
}

#[tauri::command]
pub async fn generate_cover_baidu(
    recipe_name: String,
    category: String,
    api_key: String,
    secret_key: String,
) -> Result<String, String> {
    let client = http_client().await?;
    let token = baidu_access_token(&client, &api_key, &secret_key).await?;

    let submit_url = format!(
        "https://aip.baidubce.com/rpc/2.0/wenxin/v1/basic/textToImage?access_token={token}"
    );

    let prompt = build_food_prompt(&recipe_name, &category);
    let submit: BaiduSubmitResponse = client
        .post(&submit_url)
        .json(&json!({
            "text": prompt,
            "resolution": "1024*1024",
            "style": "写实风格",
            "num": 1
        }))
        .send()
        .await
        .map_err(|e| format!("提交百度生图失败: {e}"))?
        .json()
        .await
        .map_err(|e| format!("解析百度生图响应失败: {e}"))?;

    if let Some(code) = submit.error_code {
        if code != 0 {
            return Err(submit
                .error_msg
                .unwrap_or_else(|| format!("百度生图错误 code={code}")));
        }
    }

    let task_id = submit
        .data
        .and_then(|d| d.task_id)
        .ok_or_else(|| "百度未返回 taskId，请确认已开通「AI作画-基础版」".to_string())?;

    let img_url = baidu_poll_image(&client, &token, &task_id).await?;
    download_as_data_url(&client, &img_url).await
}

#[derive(Deserialize)]
struct BingImageItem {
    #[serde(rename = "contentUrl")]
    content_url: Option<String>,
    #[serde(rename = "thumbnailUrl")]
    thumbnail_url: Option<String>,
}

#[derive(Deserialize)]
struct BingSearchResponse {
    value: Option<Vec<BingImageItem>>,
}

#[tauri::command]
pub async fn search_cover_bing(
    recipe_name: String,
    api_key: String,
    endpoint: String,
) -> Result<String, String> {
    let client = http_client().await?;
    let query = format!("{} 中餐 美食", recipe_name.trim());

    let resp: BingSearchResponse = client
        .get(&endpoint)
        .header("Ocp-Apim-Subscription-Key", &api_key)
        .query(&[
            ("q", query.as_str()),
            ("mkt", "zh-CN"),
            ("count", "1"),
            ("safeSearch", "Strict"),
        ])
        .send()
        .await
        .map_err(|e| format!("Bing 图片搜索失败: {e}"))?
        .json()
        .await
        .map_err(|e| format!("解析 Bing 响应失败: {e}"))?;

    let item = resp
        .value
        .and_then(|v| v.into_iter().next())
        .ok_or_else(|| "Bing 未找到相关图片".to_string())?;

    let img_url = item
        .content_url
        .or(item.thumbnail_url)
        .ok_or_else(|| "Bing 返回的图片 URL 无效".to_string())?;

    download_as_data_url(&client, &img_url).await
}

/// 从百度图片搜索 JSON 响应中提取图片 URL（无需 API Key，国内可用）
fn parse_baidu_image_urls(body: &str) -> Vec<String> {
    let keys = [
        "middleURL",
        "thumbURL",
        "hoverURL",
        "replaceUrl",
        "objURL",
    ];
    let mut urls = Vec::new();

    for key in keys {
        let needle = format!("\"{key}\":\"");
        let mut search_from = 0usize;
        while let Some(rel) = body[search_from..].find(&needle) {
            let start = search_from + rel + needle.len();
            if let Some(end) = body[start..].find('"') {
                let raw = &body[start..start + end];
                let url = raw
                    .replace("\\/", "/")
                    .replace("\\u002F", "/")
                    .replace("\\u0026", "&");
                let lower = url.to_lowercase();
                let ok = url.starts_with("http")
                    && !lower.contains("logo")
                    && !lower.contains("icon")
                    && !lower.contains("avatar")
                    && !lower.contains("baidu.com/link?")
                    && !urls.contains(&url);
                if ok {
                    urls.push(url);
                }
            }
            search_from = start.saturating_add(1);
        }
    }

    urls
}

async fn download_with_referer(
    client: &reqwest::Client,
    url: &str,
    referer: &str,
) -> Result<String, String> {
    let response = client
        .get(url)
        .header("Referer", referer)
        .header("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
        .header("Accept-Language", "zh-CN,zh;q=0.9")
        .send()
        .await
        .map_err(|e| format!("下载图片失败: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("图片下载 HTTP {}", response.status()));
    }

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("读取图片失败: {e}"))?;

    if bytes.len() < 2048 {
        return Err("图片过小，可能不是有效美食图".into());
    }

    let mime = content_type.split(';').next().unwrap_or("image/jpeg");
    let b64 = general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{mime};base64,{b64}"))
}

#[tauri::command]
pub async fn search_cover_baidu_images(recipe_name: String) -> Result<String, String> {
    let name = recipe_name.trim();
    if name.is_empty() {
        return Err("菜名为空".into());
    }

    let client = http_client().await?;
    let query = format!("{name} 美食 菜品");

    let resp = baidu_search_headers(client.get("https://image.baidu.com/search/acjson"))
        .query(&[
            ("tn", "resultjson_com"),
            ("word", query.as_str()),
            ("queryWord", query.as_str()),
            ("pn", "0"),
            ("rn", "20"),
            ("ie", "utf-8"),
            ("oe", "utf-8"),
            ("istype", "2"),
            ("face", "0"),
            ("ct", "201326592"),
        ])
        .send()
        .await
        .map_err(|e| format!("百度图片搜索失败: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("百度图片搜索 HTTP {}", resp.status()));
    }

    let body = resp
        .text()
        .await
        .map_err(|e| format!("读取百度图片响应失败: {e}"))?;

    let urls = parse_baidu_image_urls(&body);
    if urls.is_empty() {
        return Err(format!(
            "未找到「{name}」相关图片（响应 {} 字节），请尝试手动选择图片",
            body.len()
        ));
    }

    let mut last_err = String::from("下载失败");
    for url in urls.iter().take(10) {
        match download_with_referer(&client, url, BAIDU_REFERER).await {
            Ok(data_url) => return Ok(data_url),
            Err(e) => last_err = e,
        }
    }

    Err(format!("找到图片但无法下载: {last_err}"))
}
