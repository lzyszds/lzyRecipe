import { requestJson } from './net';
import { isTauri } from './tauri';

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** 语音转文字模型（可选），留空则使用 model 同服务商下的默认值 */
  transcribeModel?: string;
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class AiError extends Error {}

function chatEndpoint(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (!base) throw new AiError('请先在「设置 → AI 助手」中填写接口地址');
  // 允许填 https://api.openai.com/v1 或完整路径
  if (/\/chat\/completions$/.test(base)) return base;
  return `${base}/chat/completions`;
}

export async function chatWithAi(
  config: AiConfig,
  messages: AiMessage[],
  options: { json?: boolean; temperature?: number; signal?: AbortSignal } = {}
): Promise<string> {
  if (!config.apiKey.trim()) throw new AiError('请先在「设置 → AI 助手」中填写 API Key');
  if (!config.model.trim()) throw new AiError('请先在「设置 → AI 助手」中填写模型名称');

  const res = await requestJson<{
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  }>(chatEndpoint(config.baseUrl), {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey.trim()}` },
    json: {
      model: config.model.trim(),
      temperature: options.temperature ?? 0.7,
      messages,
      ...(options.json ? { response_format: { type: 'json_object' } } : {}),
    },
    timeoutMs: 120000,
    signal: options.signal,
  });

  const content = res.choices?.[0]?.message?.content?.trim();
  if (!content) throw new AiError(res.error?.message || 'AI 没有返回内容，请检查模型配置');
  return content;
}

/** 从模型回复里提取 JSON（兼容 ```json 代码块或前后多余文字） */
export function parseJsonReply<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1)) as T;
    throw new AiError('AI 返回的内容无法解析，请重试');
  }
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * 语音转文字：上传录音到 OpenAI 兼容的 /audio/transcriptions。
 * 原生端走 Rust multipart，浏览器端退化为 Web Speech API 之外的直连上传。
 */
export async function transcribeAudio(
  config: AiConfig,
  audio: Blob,
  options: { language?: string } = {}
): Promise<string> {
  if (!config.apiKey.trim()) throw new AiError('请先在设置中填写 AI API Key（语音识别需要它）');
  if (!isTauri()) throw new AiError('语音识别请在 App 中使用（浏览器预览不支持上传音频）');

  const { invoke } = await import('@tauri-apps/api/core');
  const base = config.baseUrl.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  const endpoint = `${base}/audio/transcriptions`;

  const buffer = new Uint8Array(await audio.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buffer.length; i += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
  }
  const base64 = btoa(binary);
  const ext = (audio.type.split('/')[1] || 'webm').replace('mpeg', 'mp3');

  return invoke<string>('speech_to_text', {
    audioBase64: base64,
    mime: audio.type || 'audio/webm',
    fileName: `note.${ext}`,
    endpoint,
    apiKey: config.apiKey.trim(),
    model: config.transcribeModel?.trim() || 'whisper-1',
    language: options.language ?? 'zh',
  });
}

/** 图片压缩为 JPEG data URL（笔记图片、菜谱封面都用它控制体积） */
export async function compressImage(
  file: File | Blob,
  options: { maxSize?: number; quality?: number } = {}
): Promise<string> {
  const maxSize = options.maxSize ?? 1280;
  const quality = options.quality ?? 0.82;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('图片读取失败'));
      image.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法处理图片');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export { base64ToBytes };
