import { chatWithAi, parseJsonReply, type AiConfig } from './ai';
import { useSettingsStore } from '../store/settingsStore';
import type { DifficultyLevel, Ingredient, Recipe } from '../types';

export function aiConfigFromSettings(): AiConfig {
  const ai = useSettingsStore.getState().ai;
  return {
    baseUrl: ai.baseUrl,
    apiKey: ai.apiKey,
    model: ai.model,
    transcribeModel: ai.transcribeModel,
  };
}

const DIFFICULTY_MAP: Record<string, DifficultyLevel> = {
  简单: 'easy',
  容易: 'easy',
  中等: 'medium',
  适中: 'medium',
  困难: 'hard',
  较难: 'hard',
};

interface DraftShape {
  name?: string;
  category?: string;
  description?: string;
  cookTime?: number | string;
  difficulty?: string;
  ingredients?: { name?: string; amount?: string }[];
  steps?: (string | { description?: string })[];
  tips?: string;
}

/** 询问 AI 生成一份菜谱草稿（只覆盖写作页的表单字段，封面另走原有逻辑） */
export async function generateRecipeDraft(input: {
  idea: string;
  category?: string;
  servings?: string;
}): Promise<DraftShape> {
  const config = aiConfigFromSettings();
  const text = await chatWithAi(
    config,
    [
      {
        role: 'system',
        content:
          '你是一位中餐家常菜厨师。根据用户给出的菜名或食材，生成一份可直接照着做的菜谱。' +
          '只输出 JSON，不要任何解释。字段：name（菜名）、category（分类，从"川菜/粤菜/湘菜/鲁菜/西餐/甜点/饮品/家常菜/海鲜/早餐/汤/肉类/蔬菜/主食/调料"中选一个）、' +
          'description（一句话简介，40字内）、cookTime（分钟，整数）、difficulty（简单/中等/困难）、' +
          'ingredients（数组，每项 {name, amount}，amount 写清楚用量如"300g""2勺"）、' +
          'steps（字符串数组，每步一句话，包含火候和时间）、tips（1-2 条实用小贴士）。',
      },
      {
        role: 'user',
        content: [
          `菜品或食材：${input.idea.trim()}`,
          input.category ? `分类倾向：${input.category}` : '',
          input.servings ? `份量：${input.servings}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ],
    { json: true, temperature: 0.6 }
  );
  return parseJsonReply<DraftShape>(text);
}

/** 把 AI 草稿规整成可填入表单的数据 */
export function normalizeDraft(draft: DraftShape, fallbackName: string) {
  const ingredients: Ingredient[] = (draft.ingredients ?? [])
    .map((item) => ({ name: String(item.name ?? '').trim(), amount: String(item.amount ?? '').trim() }))
    .filter((item) => item.name);
  const steps = (draft.steps ?? [])
    .map((step) => (typeof step === 'string' ? step : step.description ?? '').trim())
    .filter(Boolean);
  return {
    name: (draft.name?.trim() || fallbackName).slice(0, 30),
    category: draft.category?.trim() || '',
    description: (draft.description ?? '').trim(),
    cookTime: Math.max(1, Math.round(Number(draft.cookTime) || 30)),
    difficulty: DIFFICULTY_MAP[draft.difficulty ?? ''] ?? 'medium',
    tips: (draft.tips ?? '').trim(),
    ingredients: ingredients.length ? ingredients : [{ name: '', amount: '' }],
    steps: steps.length ? steps : [''],
  };
}

export interface RecipeQaContext {
  recipe: Recipe;
}

/** 菜谱问答：带上当前菜谱信息，回答用户的做法问题 */
export async function askAboutRecipe(
  context: RecipeQaContext,
  history: { role: 'user' | 'assistant'; content: string }[],
  question: string
): Promise<string> {
  const { recipe } = context;
  const summary = [
    `菜名：${recipe.name}`,
    `分类：${recipe.category}，用时约 ${recipe.cookTime} 分钟`,
    recipe.description ? `简介：${recipe.description}` : '',
    `食材：${recipe.ingredients.map((i) => `${i.name}${i.amount ? ` ${i.amount}` : ''}`).join('、')}`,
    `步骤：${recipe.steps.map((s, i) => `${i + 1}. ${s.description}`).join(' ')}`,
    recipe.tips ? `小贴士：${recipe.tips}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return chatWithAi(
    aiConfigFromSettings(),
    [
      {
        role: 'system',
        content:
          '你是中餐烹饪助手，正在帮用户做下面这道菜。回答要简洁、可操作，优先给出具体用量、火候和时间；' +
          '用户问替换食材、调整份量、补救失败时，给出最实用的方案。用中文回答，不用 Markdown 标题。\n\n' +
          summary,
      },
      ...history,
      { role: 'user', content: question },
    ],
    { temperature: 0.5 }
  );
}
