import { useSettingsStore } from '@/store/settingsStore';
import { chatWithAi, parseJsonReply, AiError } from './ai';
import { Recipe, Ingredient, Step, DifficultyLevel } from '@/types';
import { DayBento, MealType } from '@/store/bentoStore';

export interface SmartBentoPlanRequest {
  scope: 'day' | 'week';
  targetDate: string; // YYYY-MM-DD
  weekDates: string[]; // 7 days of the week
  userPrompt?: string; // e.g. "我今天上火，要吃清淡的"
  allRecipes: Recipe[];
  currentBentoByDate: Record<string, DayBento>;
}

export interface GeneratedBentoPlan {
  slots: Record<string, { breakfast?: string[]; lunch?: string[]; dinner?: string[] }>;
  summary: string;
}

/**
 * AI 智能搭配便当计划（支持自然语言诉求输入，如「今天上火想吃清淡」、「减脂高蛋白」等）
 */
export async function planBentoWithAi(
  req: SmartBentoPlanRequest
): Promise<GeneratedBentoPlan> {
  const { scope, targetDate, weekDates, userPrompt = '', allRecipes, currentBentoByDate } = req;
  const datesToPlan = scope === 'day' ? [targetDate] : weekDates;

  // 1. 获取用户 AI 设置
  const aiSettings = useSettingsStore.getState().ai;
  const hasAiConfig = Boolean(
    aiSettings.baseUrl?.trim() && aiSettings.apiKey?.trim() && aiSettings.model?.trim()
  );

  // 2. 准备候选菜品摘要（节省 tokens 并防止超出上下文）
  const candidatePool = allRecipes.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    cookTime: r.cookTime,
    difficulty: r.difficulty,
    ingredients: r.ingredients.map((i) => i.name).slice(0, 4).join(','),
  }));

  // 3. 准备待填充的空餐位信息
  const neededSlots: Record<string, MealType[]> = {};
  for (const d of datesToPlan) {
    const existing = currentBentoByDate[d];
    const missing: MealType[] = [];
    if (!existing || existing.breakfast.length === 0) missing.push('breakfast');
    if (!existing || existing.lunch.length === 0) missing.push('lunch');
    if (!existing || existing.dinner.length === 0) missing.push('dinner');
    if (missing.length > 0) {
      neededSlots[d] = missing;
    }
  }

  // 如果所有餐位都已经排满
  if (Object.keys(neededSlots).length === 0) {
    return {
      slots: {},
      summary: '所选范围内的便当餐位均已排满，无需填充。',
    };
  }

  // 4. 如果配置了真实 AI 接口，调用大模型智能推理配餐
  if (hasAiConfig) {
    try {
      const systemPrompt = `你是一位精通中西烹饪、营养学与食疗养生的专业主厨。
你的任务是根据用户的身体状况、口味偏好或特殊要求，从【候选菜谱库】中挑选最合适、搭配合理的菜品 ID，填入用户便当盒的空白餐位。
规则要求：
1. 只能从提供的候选菜谱库中挑选存在的菜品 id。
2. 早餐推荐 1 道（多为清淡主食、蛋类、面点、汤饮）；午餐推荐 1~2 道（主荤+素/小炒）；晚餐推荐 1~2 道（少油养胃、家常）。
3. 必须严格遵循用户的身体状况或口味要求（例如：用户说"上火"，应严禁辛辣油炸，首选清淡、苦瓜冬瓜、蒸煮汤品、生津润燥菜品；用户说"减脂"，首选高蛋白低油低卡肉类与蔬菜）。
4. 必须输出合法 JSON，格式为：
{
  "summary": "配餐理由与建议（20字内）",
  "plan": {
    "YYYY-MM-DD": {
      "breakfast": ["id"],
      "lunch": ["id1", "id2"],
      "dinner": ["id1", "id2"]
    }
  }
}`;

      const userMessage = `【用户需求/口味或身体状态】：${userPrompt.trim() || '日常家常荤素搭配，营养均衡'}
【待填充的空餐位】：${JSON.stringify(neededSlots)}
【候选菜谱库（部分）】：${JSON.stringify(candidatePool.slice(0, 70))}
请只为上述待填充的空餐位匹配最合适的菜品 id。`;

      const aiReply = await chatWithAi(
        aiSettings,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        { json: true, temperature: 0.6, timeoutMs: 25000 }
      );

      const parsed = parseJsonReply<{
        summary?: string;
        plan?: Record<string, { breakfast?: string[]; lunch?: string[]; dinner?: string[] }>;
      }>(aiReply);

      if (parsed?.plan && Object.keys(parsed.plan).length > 0) {
        return {
          slots: parsed.plan,
          summary: parsed.summary || '已根据您的需求定制搭配完成',
        };
      }
    } catch (err) {
      console.warn('AI planning failed, fallback to smart rule engine:', err);
    }
  }

  // 5. 本地智能降级启发式引擎（无需 AI 接口或网络失败时 100% 可用）
  return localRuleBentoPlan(neededSlots, userPrompt, allRecipes);
}

/**
 * 本地智能配餐引擎（基于意图分析与营养标签）
 */
function localRuleBentoPlan(
  neededSlots: Record<string, MealType[]>,
  userPrompt: string,
  allRecipes: Recipe[]
): GeneratedBentoPlan {
  const p = userPrompt.toLowerCase();

  // 意图识别
  const isCooling = /上火|降火|清淡|不辣|少油|喉咙|牙痛|便秘|微辣/.test(p);
  const isDiet = /减脂|减肥|低卡|控糖|高蛋白|健身|轻食/.test(p);
  const isFast = /快手|简单|懒人|20分|赶时间|方便/.test(p);
  const isSpicy = /下饭|重口|辣|香辣|麻辣|开胃|过瘾/.test(p);

  // 过滤池
  let pool = [...allRecipes];

  if (isCooling) {
    pool = pool.filter((r) => {
      const text = `${r.name} ${r.category} ${r.description} ${r.ingredients.map((i) => i.name).join(' ')}`;
      const hasSpicy = /辣椒|小米辣|泡椒|花椒|麻辣|水煮|红油/.test(text);
      const isGood = /汤|蒸|白灼|冬瓜|黄瓜|蔬菜|豆腐|番茄|鸡蛋|鸡汤|清炖/.test(text);
      return !hasSpicy || isGood;
    });
  } else if (isDiet) {
    pool = pool.filter((r) => {
      const text = `${r.name} ${r.ingredients.map((i) => i.name).join(' ')}`;
      return /鸡胸|虾|鱼|牛肉|蛋|生菜|西蓝花|蔬菜|冬瓜/.test(text);
    });
  } else if (isFast) {
    pool = pool.filter((r) => (r.cookTime || 30) <= 20);
  } else if (isSpicy) {
    pool = pool.filter((r) => ['川菜', '湘菜'].includes(r.category) || /辣|酱/.test(r.name));
  }

  if (pool.length < 5) {
    pool = allRecipes;
  }

  const breakfastCandidates = pool.filter((r) =>
    ['早餐', '主食', '汤', '饮品'].includes(r.category) || /粥|蛋|面|包|燕麦|牛奶/.test(r.name)
  );
  const mealCandidates = pool.filter((r) => !['饮品', '甜点'].includes(r.category));

  const getRandom = (arr: Recipe[]) => arr[Math.floor(Math.random() * arr.length)];

  const slotsResult: Record<string, { breakfast?: string[]; lunch?: string[]; dinner?: string[] }> =
    {};

  for (const [date, missingMeals] of Object.entries(neededSlots)) {
    slotsResult[date] = {};

    if (missingMeals.includes('breakfast')) {
      const pick = getRandom(breakfastCandidates.length ? breakfastCandidates : pool);
      if (pick) slotsResult[date].breakfast = [pick.id];
    }

    if (missingMeals.includes('lunch')) {
      const p1 = getRandom(mealCandidates.length ? mealCandidates : pool);
      let p2 = getRandom(mealCandidates.length ? mealCandidates : pool);
      if (p1 && p2 && p1.id === p2.id) {
        p2 = getRandom(mealCandidates.length ? mealCandidates : pool);
      }
      const ids = [p1?.id, p2?.id].filter((id): id is string => Boolean(id) && id !== p1?.id);
      slotsResult[date].lunch = p1 ? [p1.id, ...ids] : [];
    }

    if (missingMeals.includes('dinner')) {
      const p1 = getRandom(mealCandidates.length ? mealCandidates : pool);
      let p2 = getRandom(mealCandidates.length ? mealCandidates : pool);
      if (p1 && p2 && p1.id === p2.id) {
        p2 = getRandom(mealCandidates.length ? mealCandidates : pool);
      }
      const ids = [p1?.id, p2?.id].filter((id): id is string => Boolean(id) && id !== p1?.id);
      slotsResult[date].dinner = p1 ? [p1.id, ...ids] : [];
    }
  }

  let summary = '已为您智能搭配荤素营养便当';
  if (isCooling) summary = '已优先挑选降火、清淡少油、温润清肠菜品';
  else if (isDiet) summary = '已优先搭配高蛋白、优质轻食菜品';
  else if (isFast) summary = '已精选 20 分钟内快手家常菜品';
  else if (isSpicy) summary = '已精选香辣过瘾、开胃下饭菜品';

  return {
    slots: slotsResult,
    summary,
  };
}

/**
 * AI 菜谱生成：支持全量一键生成 或 局部生成指定字段（如步骤、食材、描述、小贴士）
 */
export type RecipeGenField = 'all' | 'description' | 'ingredients' | 'steps' | 'tips';

export interface AiRecipeGenRequest {
  field: RecipeGenField;
  recipeName: string;
  category?: string;
  cookTime?: string;
  difficulty?: DifficultyLevel;
  currentIngredients?: Ingredient[];
  currentSteps?: Step[];
  extraPrompt?: string; // 用户补充要求
}

export interface AiRecipeGenResult {
  name?: string;
  category?: string;
  cookTime?: number;
  difficulty?: DifficultyLevel;
  description?: string;
  ingredients?: Ingredient[];
  steps?: Step[];
  tips?: string;
}

export async function generateRecipeWithAi(
  req: AiRecipeGenRequest
): Promise<AiRecipeGenResult> {
  const aiSettings = useSettingsStore.getState().ai;
  const hasAiConfig = Boolean(
    aiSettings.baseUrl?.trim() && aiSettings.apiKey?.trim() && aiSettings.model?.trim()
  );

  if (!hasAiConfig) {
    throw new AiError('请先前往「我的 → AI 助手配置」填写 API 接口与密钥，即可开启 AI 一键生成功能。');
  }

  const { field, recipeName, category, cookTime, difficulty, currentIngredients, currentSteps, extraPrompt } = req;

  let systemPrompt = '你是一位专业的中西餐行政主厨，擅长撰写条理清晰、火候精确、通俗易懂的家庭烹饪食谱。';
  let userPrompt = '';

  if (field === 'all') {
    systemPrompt += ` 请为菜品【${recipeName}】创作完整食谱。输出必须是合法 JSON：
{
  "name": "${recipeName}",
  "category": "菜系/分类（如：家常菜、川菜、粤菜等）",
  "cookTime": 25,
  "difficulty": "easy" 或 "medium" 或 "hard",
  "description": "一句极具食欲的美食介绍（25字内）",
  "ingredients": [
    { "name": "主要食材/调料", "amount": "克数或份量（如 300g、2勺）" }
  ],
  "steps": [
    { "order": 1, "description": "烹饪步骤具体描述" }
  ],
  "tips": "大厨不外传的关键诀窍（20字内）"
}`;
    userPrompt = `菜名：${recipeName}，分类倾向：${category || '家常菜'}。补充要求：${extraPrompt || '适合家庭厨房，调料常见好买，步骤精炼'}`;
  } else if (field === 'description') {
    systemPrompt += ' 请为这道菜写一句令人食指大动、生动有食欲的菜品简介（20~30字），直接输出纯文本，不要带有额外引号或前缀。';
    userPrompt = `菜名：${recipeName}，主要食材：${currentIngredients?.map((i) => i.name).filter(Boolean).join('、') || '常见食材'}`;
  } else if (field === 'ingredients') {
    systemPrompt += ` 请为菜品【${recipeName}】列出精准的用料食材表。输出必须是合法 JSON：
{
  "ingredients": [
    { "name": "食材或调料名", "amount": "份量（如 300g, 2勺）" }
  ]
}`;
    userPrompt = `菜名：${recipeName}，已有参考：${currentIngredients?.map((i) => i.name).join('、')}。补充要求：${extraPrompt || '用料地道，分清主料与辅料调料'}`;
  } else if (field === 'steps') {
    systemPrompt += ` 请为菜品【${recipeName}】编写条理清晰、步骤明确的烹饪步骤。输出必须是合法 JSON：
{
  "steps": [
    { "order": 1, "description": "步骤1描述" },
    { "order": 2, "description": "步骤2描述" }
  ]
}`;
    userPrompt = `菜名：${recipeName}，食材：${currentIngredients?.map((i) => `${i.name}${i.amount ? `(${i.amount})` : ''}`).join('、')}。补充要求：${extraPrompt || '讲清火候、油温与下锅顺序'}`;
  } else if (field === 'tips') {
    systemPrompt += ' 请为这道菜提供 1~2 个最关键的烹饪防翻车小秘诀或风味升级要点。输出纯文本（30~50字），不要带有任何多余格式。';
    userPrompt = `菜名：${recipeName}，步骤：${currentSteps?.map((s) => s.description).join('；')}`;
  }

  const aiReply = await chatWithAi(
    aiSettings,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    {
      json: field !== 'description' && field !== 'tips',
      temperature: 0.7,
      timeoutMs: 35000,
    }
  );

  if (field === 'description') {
    return { description: aiReply.replace(/^["'“”]|["'“”]$/g, '').trim() };
  }

  if (field === 'tips') {
    return { tips: aiReply.trim() };
  }

  try {
    const parsed = parseJsonReply<any>(aiReply);
    return parsed;
  } catch (e) {
    throw new AiError('AI 回复的食谱格式解析失败，请重试');
  }
}
