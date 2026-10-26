import { AiSettings } from '@/store/settingsStore';
import { wrapCorsProxy } from './proxyUrl';

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

  const endpoint = wrapCorsProxy(chatEndpoint(config.baseUrl));
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 60000;
  let timer = setTimeout(() => controller.abort(), timeoutMs);

  const requestAi = (useJsonFormat: boolean) =>
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.model.trim(),
        temperature: options.temperature ?? 0.7,
        messages,
        ...(options.json && useJsonFormat
          ? { response_format: { type: 'json_object' } }
          : {}),
      }),
      signal: controller.signal,
    });

  try {
    let res = await requestAi(true);

    // 部分模型(如 NVIDIA NIM 的 VL/推理系列)不支持 response_format=json_object,会直接
    // 返回 400/500/503;此时去掉该参数重试一次,JSON 由 parseJsonReply 兜底解析
    if (!res.ok && options.json && [400, 500, 502, 503].includes(res.status)) {
      clearTimeout(timer);
      timer = setTimeout(() => controller.abort(), timeoutMs);
      res = await requestAi(false);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) {
          errMsg = errJson.error.message;
        }
      } catch {}
      // 模型不存在(404)或已下架(410),给出可操作的提示
      if (res.status === 404 || res.status === 410) {
        throw new AiError(`该模型不存在或已下线(HTTP ${res.status}),请点「自动拉取模型」从在售列表中选择`);
      }
      throw new AiError(errMsg);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new AiError(data.error?.message || 'AI 未返回有效内容，请检查模型名称是否正确');
    }
    return content;
  } catch (err: any) {
    // React Native 里 abort 的报错名不一定是 AbortError（如「fetch request has been canceled」），按消息兜底
    const aborted =
      err?.name === 'AbortError' || /canceled|cancelled|aborted/i.test(String(err?.message || ''));
    if (aborted) {
      throw new AiError(
        `请求超时（超过 ${Math.round(timeoutMs / 1000)} 秒），请检查网络或更换更快的模型`
      );
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

export interface RemoteModelInfo {
  id: string;
  name: string;
  ownedBy?: string;
  sizeBadge: string;
  vendorBadge: string;
  freeBadge?: string;
  typeBadge: string;
  isRecommended?: boolean;
}

export function parseModelInfo(id: string, ownedBy = '', baseUrl = ''): RemoteModelInfo {
  let sizeBadge = '通用规格';
  const sizeMatch = id.match(/(\d+x\d+[bB]|\d+(?:\.\d+)?[bBmM])/);
  if (sizeMatch) {
    sizeBadge = sizeMatch[1].toUpperCase() + ' 参数';
  } else if (id.includes('mini') || id.includes('flash') || id.includes('small')) {
    sizeBadge = '轻量极速';
  } else if (id.includes('large') || id.includes('ultra') || id.includes('4o')) {
    sizeBadge = '旗舰全能';
  }

  let vendorBadge = '开源/中立';
  const lower = (id + ' ' + ownedBy).toLowerCase();
  if (lower.includes('meta')) vendorBadge = 'Meta';
  else if (lower.includes('nvidia') || lower.includes('nemotron')) vendorBadge = 'NVIDIA';
  else if (lower.includes('google') || lower.includes('gemma')) vendorBadge = 'Google';
  else if (lower.includes('mistral') || lower.includes('codestral')) vendorBadge = 'Mistral';
  else if (lower.includes('microsoft') || lower.includes('phi')) vendorBadge = 'Microsoft';
  else if (lower.includes('openai') || lower.includes('gpt-')) vendorBadge = 'OpenAI';
  else if (lower.includes('deepseek')) vendorBadge = 'DeepSeek';
  else if (lower.includes('qwen') || lower.includes('alibaba')) vendorBadge = '阿里';
  else if (lower.includes('glm') || lower.includes('z-ai') || lower.includes('zhipu')) vendorBadge = '智谱';
  else if (lower.includes('moonshot') || lower.includes('kimi')) vendorBadge = 'Kimi';
  else if (lower.includes('minimax')) vendorBadge = 'MiniMax';

  let freeBadge: string | undefined;
  if (baseUrl.includes('nvidia.com')) {
    freeBadge = '含免费体验额度';
  } else if (baseUrl.includes('siliconflow.cn') && (id.includes('free') || id.includes('THUDM') || id.includes('Qwen2.5-7B'))) {
    freeBadge = '免费/高性价比';
  } else if (id.includes('free') || id.includes('mini') || id.includes('flash')) {
    freeBadge = '免费/高性价比';
  }

  let typeBadge = '指令对话';
  if (/vision|vl|multimodal|deplot|kosmos/.test(lower)) {
    typeBadge = '视觉多模态';
  } else if (/code|coder|starcoder/.test(lower)) {
    typeBadge = '代码专家';
  } else if (/reason|r1|o1|o3|thinking/.test(lower)) {
    typeBadge = '深度推理';
  } else if (/embed/.test(lower)) {
    typeBadge = '向量检索';
  }

  const isRecommended = Boolean(
    id === 'meta/llama-3.1-70b-instruct' ||
    id === 'nvidia/llama-3.1-nemotron-70b-instruct' ||
    id === 'deepseek-ai/DeepSeek-V3' ||
    id === 'deepseek-ai/DeepSeek-R1' ||
    id === 'Qwen/Qwen2.5-72B-Instruct' ||
    id === 'meta/llama-3.2-11b-vision-instruct' ||
    id === 'google/gemma-3-12b-it' ||
    id === 'mistralai/mixtral-8x22b-v0.1'
  );

  const cleanName = id.includes('/') ? id.split('/').pop() || id : id;

  return {
    id,
    name: cleanName,
    ownedBy,
    sizeBadge,
    vendorBadge,
    freeBadge,
    typeBadge,
    isRecommended,
  };
}

/**
 * 自动向 API 接口拉取支持的模型列表（兼容 NVIDIA NIM、OpenAI 及中转商）
 */
export async function fetchRemoteModels(
  baseUrl: string,
  apiKey?: string
): Promise<RemoteModelInfo[]> {
  const base = baseUrl.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  if (!base) {
    throw new AiError('请先输入有效的 API 基础地址');
  }

  const targetUrl = base.endsWith('/v1') ? `${base}/models` : `${base}/v1/models`;
  const modelsEndpoint = wrapCorsProxy(targetUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(modelsEndpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(apiKey?.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      if (!base.endsWith('/v1')) {
        const fallbackRes = await fetch(wrapCorsProxy(`${base}/models`), {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...(apiKey?.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
          },
        }).catch(() => null);

        if (fallbackRes?.ok) {
          const fbData = await fallbackRes.json();
          return parseModelList(fbData?.data || [], base);
        }
      }

      if (base.includes('openai.com') && (res.status === 401 || !apiKey)) {
        return parseModelList([
          { id: 'gpt-4o-mini', owned_by: 'openai' },
          { id: 'gpt-4o', owned_by: 'openai' },
          { id: 'o1-mini', owned_by: 'openai' },
          { id: 'o1-preview', owned_by: 'openai' },
          { id: 'gpt-4-turbo', owned_by: 'openai' },
          { id: 'gpt-3.5-turbo', owned_by: 'openai' },
        ], base);
      }

      const errText = await res.text().catch(() => '');
      throw new AiError(`拉取模型失败 (HTTP ${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const rawList: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

    return parseModelList(rawList, base);
  } catch (err: any) {
    if (base.includes('openai.com')) {
      return parseModelList([
        { id: 'gpt-4o-mini', owned_by: 'openai' },
        { id: 'gpt-4o', owned_by: 'openai' },
        { id: 'o1-mini', owned_by: 'openai' },
        { id: 'o1-preview', owned_by: 'openai' },
        { id: 'gpt-4-turbo', owned_by: 'openai' },
        { id: 'gpt-3.5-turbo', owned_by: 'openai' },
      ], base);
    }
    if (err?.name === 'AbortError' || /canceled|cancelled|aborted/i.test(String(err?.message || ''))) {
      throw new AiError('拉取模型超时，请检查接口网络是否通畅');
    }
    if (err instanceof AiError) throw err;
    throw new AiError(err?.message || '无法获取模型列表，请确认地址有效');
  } finally {
    clearTimeout(timer);
  }
}

function parseModelList(rawList: any[], base: string): RemoteModelInfo[] {
  const items: RemoteModelInfo[] = [];
  for (const item of rawList) {
    const id = typeof item === 'string' ? item : item.id;
    if (!id || typeof id !== 'string') continue;
    if (id.includes('whisper') || id.includes('tts') || id.includes('dall-e') || id.includes('moderation')) {
      continue;
    }
    const ownedBy = typeof item === 'object' ? item.owned_by || '' : '';
    items.push(parseModelInfo(id, ownedBy, base));
  }

  items.sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;
    return a.id.localeCompare(b.id);
  });

  return items;
}
