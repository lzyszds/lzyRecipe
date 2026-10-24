import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Recipe, Ingredient, Step, DifficultyLevel } from '@/types';
import { AiSettings } from '@/store/settingsStore';
import { chatWithAi, parseJsonReply, AiError } from './ai';

export const VALID_CATEGORIES = [
  '川菜',
  '粤菜',
  '湘菜',
  '鲁菜',
  '西餐',
  '甜点',
  '饮品',
  '家常菜',
  '海鲜',
  '早餐',
  '汤',
  '肉类',
  '蔬菜',
  '主食',
  '调料',
];

export type DeduplicationStrategy = 'skip' | 'overwrite' | 'rename';

export interface DeduplicationItem {
  id: string;
  recipe: Recipe;
  isDuplicate: boolean;
  duplicateReason?: string;
  matchedExistingRecipe?: Recipe;
  selected: boolean;
}

/**
 * 安全挑选本地 JSON 文件
 */
export async function pickJsonDocument(): Promise<{
  ok: boolean;
  name?: string;
  content?: string;
  error?: string;
}> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json,text/plain';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (!file) {
            resolve({ ok: false, error: '未选择任何文件' });
            return;
          }
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              ok: true,
              name: file.name,
              content: (event.target?.result as string) || '',
            });
          };
          reader.onerror = () => {
            resolve({ ok: false, error: '读取文件失败' });
          };
          reader.readAsText(file);
        };
        input.click();
      } catch (err: any) {
        resolve({ ok: false, error: err.message || '打开文件选择器失败' });
      }
    });
  }

  try {
    const DocumentPicker = require('expo-document-picker');
    const FileSystem = require('expo-file-system');

    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/*', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { ok: false, error: '已取消选择' };
    }

    const asset = result.assets[0];
    const content = await FileSystem.readAsStringAsync(asset.uri);
    return {
      ok: true,
      name: asset.name,
      content,
    };
  } catch (err: any) {
    return {
      ok: false,
      error:
        err.message?.includes('Cannot find native module') ||
        err.message?.includes('ExpoDocumentPicker')
          ? 'FILE_PICKER_NATIVE_MISSING'
          : err.message || '文件读取失败',
    };
  }
}

/**
 * 从系统剪贴板读取文本
 */
export async function readClipboardContent(): Promise<string> {
  try {
    return (await Clipboard.getStringAsync()) || '';
  } catch {
    return '';
  }
}

/**
 * 校验并规整化单个 Recipe 对象
 */
export function normalizeRecipe(raw: any, index = 0): Recipe {
  const now = new Date().toISOString();
  const rawName = typeof raw.name === 'string' ? raw.name.trim() : `未命名菜谱_${index + 1}`;
  const cleanName = rawName.replace(/^(\d+[.、\s]+|[【[](.*?)[】\]])/, '').trim() || rawName;

  let category = typeof raw.category === 'string' ? raw.category.trim() : '家常菜';
  if (!VALID_CATEGORIES.includes(category)) {
    if (category.includes('川')) category = '川菜';
    else if (category.includes('粤') || category.includes('广')) category = '粤菜';
    else if (category.includes('湘') || category.includes('辣')) category = '湘菜';
    else if (category.includes('海鲜') || category.includes('鱼') || category.includes('虾')) category = '海鲜';
    else if (category.includes('汤') || category.includes('煲')) category = '汤';
    else if (category.includes('肉')) category = '肉类';
    else if (category.includes('菜') || category.includes('素')) category = '蔬菜';
    else if (category.includes('甜') || category.includes('点心')) category = '甜点';
    else if (category.includes('面') || category.includes('饭') || category.includes('主食')) category = '主食';
    else category = '家常菜';
  }

  let cookTime = Number(raw.cookTime);
  if (isNaN(cookTime) || cookTime <= 0) {
    const timeMatch = String(raw.cookTime || '').match(/\d+/);
    cookTime = timeMatch ? parseInt(timeMatch[0], 10) : 20;
  }

  let difficulty: DifficultyLevel = 'medium';
  if (raw.difficulty === 'easy' || raw.difficulty === '简单') difficulty = 'easy';
  else if (raw.difficulty === 'hard' || raw.difficulty === '困难' || raw.difficulty === '进阶') difficulty = 'hard';

  // 规整化食材：同时兼容数组、按「主料/辅料/调味料」分组的对象、字符串
  const ingredients: Ingredient[] = [];
  const pushIngredient = (item: any) => {
    if (typeof item === 'string') {
      const line = item.trim();
      if (!line) return;
      const parts = line.split(/[:：\s\t]+/);
      ingredients.push({
        name: parts[0] || line,
        amount: parts.slice(1).join(' ') || '适量',
      });
      return;
    }
    if (!item || typeof item !== 'object') return;
    const name = String(item.name ?? item.ingredient ?? item.title ?? '').trim();
    const amount = String(item.amount ?? item.quantity ?? item.unit ?? '').trim();
    if (name) {
      ingredients.push({ name, amount: amount || '适量' });
    }
  };
  const collectIngredients = (input: any) => {
    if (Array.isArray(input)) {
      input.forEach((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item) && (
          'name' in item || 'amount' in item || 'quantity' in item
        )) {
          pushIngredient(item);
        } else if (Array.isArray(item)) {
          item.forEach(pushIngredient);
        } else {
          pushIngredient(item);
        }
      });
      return;
    }
    if (typeof input === 'string') {
      input.split(/\r?\n/).forEach(pushIngredient);
      return;
    }
    if (input && typeof input === 'object') {
      const entries = Object.entries(input);
      const isNameAmountMap =
        !('name' in input) &&
        entries.length > 0 &&
        entries.every(([, v]) => typeof v === 'string' || typeof v === 'number');
      if (isNameAmountMap) {
        entries.forEach(([key, value]) => {
          const name = key.trim();
          if (!name) return;
          const amount = String(value ?? '').trim();
          ingredients.push({ name, amount: amount || '适量' });
        });
        return;
      }
      Object.values(input).forEach(collectIngredients);
    }
  };
  collectIngredients(raw.ingredients);

  // 规整化步骤：同时兼容 description / content / text 等字段
  const steps: Step[] = [];
  const pushStep = (stepItem: any, idx: number) => {
    if (typeof stepItem === 'string') {
      const text = stepItem.trim();
      if (text) steps.push({ order: idx + 1, description: text });
      return;
    }
    if (!stepItem || typeof stepItem !== 'object') return;
    const description = String(
      stepItem.description ?? stepItem.content ?? stepItem.text ?? stepItem.desc ?? ''
    ).trim();
    if (!description) return;
    steps.push({
      order: Number(stepItem.order) || idx + 1,
      description,
      image: stepItem.image ? String(stepItem.image) : undefined,
    });
  };
  if (Array.isArray(raw.steps)) {
    raw.steps.forEach(pushStep);
  } else if (typeof raw.steps === 'string') {
    raw.steps
      .split(/\r?\n/)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .forEach((s: string, idx: number) => steps.push({ order: idx + 1, description: s }));
  }

  // 规整化贴士：数组需拼接为字符串
  let tips = '';
  if (typeof raw.tips === 'string') {
    tips = raw.tips.trim();
  } else if (Array.isArray(raw.tips)) {
    tips = raw.tips
      .map((t: any) => (typeof t === 'string' ? t.trim() : ''))
      .filter(Boolean)
      .join('\n');
  }

  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    name: cleanName,
    category,
    coverImage:
      typeof raw.coverImage === 'string' &&
      (raw.coverImage.startsWith('http://') ||
        raw.coverImage.startsWith('https://') ||
        raw.coverImage.startsWith('data:image/'))
        ? raw.coverImage.trim()
        : '',
    description: typeof raw.description === 'string' ? raw.description.trim() : `${cleanName}，家常美味做法。`,
    ingredients: ingredients.length > 0 ? ingredients : [{ name: '食材', amount: '适量' }],
    steps: steps.length > 0 ? steps : [{ order: 1, description: '下锅烹饪煮熟装盘即可。' }],
    tips,
    cookTime,
    difficulty,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
    aiGenerated: Boolean(raw.aiGenerated),
  };
}

/**
 * 解析任意输入的 JSON 文本
 */
export function parseJsonRecipeContent(content: string): {
  ok: boolean;
  recipes: Recipe[];
  error?: string;
} {
  const trimmed = content.trim();
  if (!trimmed) {
    return { ok: false, recipes: [], error: 'JSON 内容为空' };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // 兼容可能包裹了 markdown 代码块
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      try {
        parsed = JSON.parse(match[1]);
      } catch (err: any) {
        return { ok: false, recipes: [], error: `JSON 语法错误: ${err.message}` };
      }
    } else {
      return { ok: false, recipes: [], error: '无法解析为合法的 JSON 格式，请检查标点或括号' };
    }
  }

  const rawArray: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.recipes)
    ? parsed.recipes
    : Array.isArray(parsed?.data)
    ? parsed.data
    : [parsed];

  if (rawArray.length === 0 || !rawArray[0] || typeof rawArray[0] !== 'object') {
    return { ok: false, recipes: [], error: 'JSON 中未检测到有效的菜谱对象' };
  }

  const recipes = rawArray.map((item, idx) => normalizeRecipe(item, idx));
  return { ok: true, recipes };
}

/**
 * 调用 AI 智能解析任意文本为 Recipe 列表
 */
export async function parseRecipesWithAi(
  rawText: string,
  aiConfig: AiSettings
): Promise<Recipe[]> {
  const text = rawText.trim();
  if (!text) {
    throw new AiError('请输入或粘贴需要解析的菜谱文本');
  }

  const systemPrompt = `你是一个专业的中文菜谱结构化提取专家。
用户的输入可能来自小红书、下厨房、公众号、聊天记录或个人随手记，内容可能包含单道或多道菜品。
你的任务是将用户提供的文本提取并整理为严格符合 JSON 数组规范的菜谱列表（Recipe[]）。

每个菜谱对象结构必须包含以下字段：
{
  "name": "菜品名称（必须是纯净菜名，勿带序号或符号）",
  "category": "必须严格是以下分类之一：川菜、粤菜、湘菜、鲁菜、西餐、甜点、饮品、家常菜、海鲜、早餐、汤、肉类、蔬菜、主食、调料",
  "description": "25字左右的一句话风味或特色简介",
  "cookTime": 烹饪耗时（分钟纯数字，如 20）,
  "difficulty": "只能是 easy、medium 或 hard 之一",
  "ingredients": [
    { "name": "主要食材或调料名", "amount": "分量带单位（如 300g、2勺、少许、适量）" }
  ],
  "steps": [
    { "order": 1, "description": "步骤说明" },
    { "order": 2, "description": "步骤说明" }
  ],
  "tips": "关键烹饪诀窍（若无则填空字符串）",
  "coverImage": ""
}

要求：
1. 提取所有关键食材与调料，主料在前、调味在后；
2. 步骤逻辑清晰连贯，剔除社交媒体口水话与推广引导；
3. 输出纯 JSON 数组，严禁包含任何说明文字。`;

  const reply = await chatWithAi(
    aiConfig,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请将以下内容提取为菜谱 JSON 数组：\n\n${text}` },
    ],
    { json: true, temperature: 0.3, timeoutMs: 60000 }
  );

  let parsed: any;
  try {
    parsed = parseJsonReply<any>(reply);
  } catch (err: any) {
    throw new AiError(`AI 解析结果格式有误: ${err.message}`);
  }

  const rawList: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.recipes)
    ? parsed.recipes
    : Array.isArray(parsed?.data)
    ? parsed.data
    : [parsed];

  if (rawList.length === 0 || !rawList[0] || typeof rawList[0] !== 'object') {
    throw new AiError('AI 未能从文本中识别出有效菜谱信息，请尝试提供更明确的食材或做法');
  }

  return rawList.map((item, idx) => {
    const r = normalizeRecipe(item, idx);
    r.aiGenerated = true;
    return r;
  });
}

/**
 * 对导入的菜品进行去重比对分析
 */
export function analyzeDuplicates(
  incomingRecipes: Recipe[],
  existingRecipes: Recipe[]
): DeduplicationItem[] {
  const existingNameMap = new Map<string, Recipe>();
  const existingIdMap = new Map<string, Recipe>();

  for (const r of existingRecipes) {
    existingNameMap.set(r.name.trim().toLowerCase(), r);
    existingIdMap.set(r.id.trim(), r);
  }

  return incomingRecipes.map((recipe, index) => {
    const key = `item_${index}_${recipe.id}`;
    const nameLower = recipe.name.trim().toLowerCase();

    if (existingIdMap.has(recipe.id)) {
      const matched = existingIdMap.get(recipe.id)!;
      return {
        id: key,
        recipe,
        isDuplicate: true,
        duplicateReason: `ID「${recipe.id}」与已有菜品「${matched.name}」相同`,
        matchedExistingRecipe: matched,
        selected: false, // 默认不勾选重复项
      };
    }

    if (existingNameMap.has(nameLower)) {
      const matched = existingNameMap.get(nameLower)!;
      return {
        id: key,
        recipe,
        isDuplicate: true,
        duplicateReason: `菜名与已有菜品「${matched.name}」重名`,
        matchedExistingRecipe: matched,
        selected: false, // 默认不勾选重复项
      };
    }

    return {
      id: key,
      recipe,
      isDuplicate: false,
      selected: true, // 新菜品默认勾选
    };
  });
}

/**
 * 根据策略执行去重处理并产出最终要保存的 Recipe[]
 */
export function applyDeduplicationStrategy(
  items: DeduplicationItem[],
  strategy: DeduplicationStrategy
): Recipe[] {
  const result: Recipe[] = [];

  for (const item of items) {
    if (!item.selected) continue;

    if (!item.isDuplicate) {
      result.push(item.recipe);
      continue;
    }

    if (strategy === 'skip') {
      // 跳过重复（如果勾选了但策略是跳过，则不导入）
      continue;
    }

    if (strategy === 'overwrite') {
      // 覆盖已有：如果已有菜品存在，沿用已有菜品的 id 以便更新覆盖
      const targetId = item.matchedExistingRecipe?.id || item.recipe.id;
      result.push({
        ...item.recipe,
        id: targetId,
        updatedAt: new Date().toISOString(),
      });
      continue;
    }

    if (strategy === 'rename') {
      // 保留两者：重命名并生成全新唯一 id
      const newId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      result.push({
        ...item.recipe,
        id: newId,
        name: `${item.recipe.name} (导入)`,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return result;
}
