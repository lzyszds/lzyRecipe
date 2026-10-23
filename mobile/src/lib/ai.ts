import { AiSettings } from '@/store/settingsStore';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiError';
  }
}

function chatEndpoint(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (!base) throw new AiError('请先在「设置 → AI 助手」中填写接口地址');
  if (/\/chat\/completions$/.test(base)) return base;
  return `${base}/chat/completions`;
}

export async function chatWithAi(
  config: AiSettings,
  messages: AiMessage[],
  options: { json?: boolean; temperature?: number; timeoutMs?: number } = {}
): Promise<string> {
  if (!config.baseUrl?.trim()) throw new AiError('请先在设置中填写 AI 接口地址');
  if (!config.apiKey?.trim()) throw new AiError('请先在设置中填写 AI API Key');
  if (!config.model?.trim()) throw new AiError('请先在设置中填写模型名称');

  const endpoint = chatEndpoint(config.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.model.trim(),
        temperature: options.temperature ?? 0.7,
        messages,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) {
          errMsg = errJson.error.message;
        }
      } catch {}
      throw new AiError(errMsg);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new AiError(data.error?.message || 'AI 未返回有效内容，请检查模型名称是否正确');
    }
    return content;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new AiError('请求超时（超过 60 秒），请检查网络或更换更快的模型');
    }
    if (err instanceof AiError) throw err;
    throw new AiError(err.message || '网络请求失败，请检查接口地址');
  } finally {
    clearTimeout(timer);
  }
}

/** 测试 AI 连通性，测量延迟与响应状态 */
export async function testAiConnection(config: AiSettings): Promise<{
  ok: boolean;
  latencyMs: number;
  reply: string;
}> {
  const start = Date.now();
  const reply = await chatWithAi(
    config,
    [
      { role: 'system', content: 'You are a culinary AI assistant.' },
      { role: 'user', content: '用一句话回答：今天吃什么好？（15字内）' },
    ],
    { temperature: 0.5, timeoutMs: 20000 }
  );
  const latencyMs = Date.now() - start;
  return { ok: true, latencyMs, reply };
}

/** 从模型回复里提取 JSON（兼容 ```json 代码块或文本截取） */
export function parseJsonReply<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1)) as T;
    }
    throw new AiError('AI 返回的格式无法被解析为 JSON，请重试');
  }
}
