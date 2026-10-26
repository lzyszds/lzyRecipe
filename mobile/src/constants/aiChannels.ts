import type { ComponentType } from 'react';
import {
  DeepseekChannelIcon,
  NvidiaChannelIcon,
  OpenaiChannelIcon,
  SiliconflowChannelIcon,
} from '@/components/AiChannelIcons';

/**
 * AI 渠道元数据（渠道商图标、名称、默认地址与默认模型）
 * 被「AI 助手配置」「AI 试菜对比」共用，改一处即可全站生效
 */
export interface AiChannelMeta {
  id: 'nvidia' | 'siliconflow' | 'deepseek' | 'custom';
  name: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  baseUrl: string;
  model: string;
  placeholderKey: string;
  desc: string;
}

export const AI_CHANNELS: AiChannelMeta[] = [
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    icon: NvidiaChannelIcon,
    iconColor: '#76B900',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model: 'minimaxai/minimax-m3.1-flash',
    placeholderKey: 'nvapi-xxxxxxxxxxxx',
    desc: '英伟达云端推理服务，实测 MiniMax M3.1 Flash 秒级出谱，模型以「自动拉取模型」列表为准',
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    icon: SiliconflowChannelIcon,
    iconColor: '#6E29F5',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3.2',
    placeholderKey: 'sk-xxxxxxxxxxxx',
    desc: '国内优质模型托管平台，支持 DeepSeek-V3.2、Qwen 等，极速响应',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek 官方',
    icon: DeepseekChannelIcon,
    iconColor: '#4D6BFE',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-flash',
    placeholderKey: 'sk-xxxxxxxxxxxx',
    desc: 'DeepSeek 官方 API，中文食谱地道、价格极低，分高峰/空闲计费',
  },
  {
    id: 'custom',
    name: '自定义接口 (OpenAI 规范)',
    icon: OpenaiChannelIcon,
    iconColor: '#857C74',
    baseUrl: '',
    model: '',
    placeholderKey: '填入自定义渠道对应的 API Key',
    desc: '自由填写任意兼容 OpenAI /chat/completions 规范的 API 接口',
  },
];

export function getAiChannelMeta(id: string): AiChannelMeta {
  return AI_CHANNELS.find((c) => c.id === id) || AI_CHANNELS[0];
}

/** 某个渠道当前应生效的默认模型（用户已保存优先，其次预设） */
export function getChannelModel(
  id: string,
  savedModels?: Record<string, string>
): string {
  if (savedModels?.[id]?.trim()) return savedModels[id].trim();
  return getAiChannelMeta(id).model;
}

/** 某个渠道当前应生效的默认地址（用户已保存优先，其次预设） */
export function getChannelBaseUrl(
  id: string,
  savedUrls?: Record<string, string>
): string {
  if (savedUrls?.[id]?.trim()) return savedUrls[id].trim();
  return getAiChannelMeta(id).baseUrl;
}
