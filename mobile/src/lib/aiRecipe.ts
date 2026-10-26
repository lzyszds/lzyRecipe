import { useSettingsStore } from '@/store/settingsStore';
import { chatWithAi, parseJsonReply, AiError, AiMessage } from './ai';
import { findUnusedIngredients } from './recipeConsistency';
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
        { json: true, temperature: 0.6, timeoutMs: 60000 }
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
  /** 可选：应用内支持的分类列表，用于约束第 1 段产出的 category */
  categoryOptions?: readonly string[];
  cookTime?: string;
  difficulty?: DifficultyLevel;
  currentIngredients?: Ingredient[];
  currentSteps?: Step[];
  extraPrompt?: string; // 用户补充要求
  /** 可选：临时使用的 AI 配置（试菜对比会传入不同模型的配置） */
  aiSettings?: import('@/store/settingsStore').AiSettings;
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
  /** 生成内容体检结果（如食材未在步骤中使用） */
  warnings?: {
    unusedIngredients?: string[];
  };
}

/* ============ 食材-步骤一致性校验与修复 ============ */

/** 让 AI 一轮重写：把没用到的食材写进步骤里 */
async function repairStepsWithAi(
  aiSettings: import('@/store/settingsStore').AiSettings,
  params: {
    recipeName: string;
    ingredients: Ingredient[];
    steps: Step[];
    missing: string[];
  }
): Promise<Step[] | null> {
  const { recipeName, ingredients, steps, missing } = params;
  const reply = await chatWithAi(
    aiSettings,
    [
      {
        role: 'system',
        content:
          '你是专业厨师食谱编辑。你会发现一份食谱里有些食材在任何步骤中都没有被使用。请重写烹饪步骤：保持原有做法思路不变，把这些遗漏的食材自然地融入合适的步骤（写明何时加入、怎么用）；若某食材确实不需要，可从逻辑判断后保留清单但明确不硬塞。输出必须是合法 JSON：{"steps": [{"order": 1, "description": "..."}]}，不要输出其他内容。',
      },
      {
        role: 'user',
        content: `菜名：${recipeName}
食材清单：${ingredients
          .map((i) => `${i.name}${i.amount ? `(${i.amount})` : ''}`)
          .join('、')}
现有步骤：
${steps.map((s, i) => `${i + 1}. ${s.description}`).join('\n')}
未出现在任何步骤中的食材（必须处理）：${missing.join('、')}`,
      },
    ],
    { json: true, temperature: 0.3, timeoutMs: 90000 }
  );

  const parsed = parseJsonReply<{ steps?: Step[] }>(reply);
  const repaired = Array.isArray(parsed?.steps) ? parsed.steps : [];
  if (repaired.length === 0) return null;
  return repaired.map((s, i) => ({
    order: i + 1,
    description: String(s?.description || '').trim(),
  }));
}

const CHEF_SYSTEM =
  '你是一位专业的中西餐行政主厨，擅长撰写条理清晰、火候精确、通俗易懂的家庭烹饪食谱。';

/** 组装“按食材清单编排步骤”的对话消息（一键生成第二段 与 单独生成步骤 共用） */
function buildStepsMessages(
  recipeName: string,
  ingredients: Ingredient[] | undefined,
  extraPrompt?: string
): AiMessage[] {
  const ingredientList = ingredients?.filter((i) => i.name?.trim()) || [];
  const ingredientLine = ingredientList.length
    ? `食材清单（步骤必须与它闭环，清单里每个食材都要用上，也不要引入清单之外的食材）：${ingredientList
        .map((i) => `${i.name}${i.amount ? `(${i.amount})` : ''}`)
        .join('、')}`
    : '食材：常见家庭食材（步骤里新出现的调味料请在描述中说清用量）';

  const systemPrompt = `${CHEF_SYSTEM} 请为菜品【${recipeName}】编写条理清晰、步骤明确的烹饪步骤。输出必须是合法 JSON：
{
  "steps": [
    { "order": 1, "description": "步骤1描述" },
    { "order": 2, "description": "步骤2描述" }
  ]
}
铁律：下面给定的每一种食材、酱料都必须在某个步骤中被实际使用（写明何时加入、怎么用）；步骤里新出现的调味料必须就是清单之内的。`;

  const userPrompt = `菜名：${recipeName}。${ingredientLine}。补充要求：${extraPrompt || '讲清火候、油温与下锅顺序'}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

/** 解析并归一化 AI 返回的步骤数组 */
function normalizeParsedSteps(parsed: unknown): Step[] {
  const list = Array.isArray((parsed as any)?.steps) ? (parsed as any).steps : [];
  return list
    .map((s: any, i: number) => ({
      order: i + 1,
      description: String(s?.description || '').trim(),
    }))
    .filter((s: Step) => s.description);
}

/** 按食材清单请求 AI 编排步骤 */
async function requestStepsWithAi(
  aiSettings: import('@/store/settingsStore').AiSettings,
  params: {
    recipeName: string;
    ingredients?: Ingredient[];
    extraPrompt?: string;
  }
): Promise<Step[]> {
  const reply = await chatWithAi(
    aiSettings,
    buildStepsMessages(params.recipeName, params.ingredients, params.extraPrompt),
    { json: true, temperature: 0.45, timeoutMs: 90000 }
  );
  return normalizeParsedSteps(parseJsonReply<{ steps?: Step[] }>(reply));
}

/**
 * “一键完整食谱”两段式流水线：
 * 第 1 段：先产出 分类/耗时/难度/简介/食材清单（可选小贴士）
 * 第 2 段：拿着固定不变的食材清单编排步骤
 * 最后：食材-步骤闭环校验，漏用食材时自动修复一轮
 */
async function generateFullRecipeWithAi(
  aiSettings: import('@/store/settingsStore').AiSettings,
  req: AiRecipeGenRequest
): Promise<AiRecipeGenResult> {
  const { recipeName, category, cookTime, difficulty, extraPrompt } = req;
  const categoryOptionsLine = req.categoryOptions?.length
    ? `分类必须严格从以下选项中选择，不要自造分类：${req.categoryOptions.join('、')}`
    : '';

  const systemPrompt = `${CHEF_SYSTEM} 请为菜品【${recipeName}】先设计“用料方案”。输出必须是合法 JSON：
{
  "name": "${recipeName}",
  "category": "菜系/分类",
  "cookTime": 25,
  "difficulty": "easy" 或 "medium" 或 "hard",
  "description": "一句极具食欲的美食介绍（25字内）",
  "ingredients": [
    { "name": "主要食材/调料", "amount": "克数或份量（如 300g、2勺）" }
  ],
  "tips": "大厨不外传的关键诀窍（20字内）"
}
用料铁律：
1. 清单必须是为后面的步骤服务的设计稿：主料在前、调味在后，用量给到可执行份量。
2. 特殊酱料/风味调味（如柱侯酱、豆瓣酱、鱼露）只列真正会在做法里用到的。
3. 品类名严格从给定分类选项中选择。${categoryOptionsLine}`;

  const userPrompt = `菜名：${recipeName}，分类倾向：${category || '家常菜'}，期望用时：${cookTime || '不限'} 分钟，难度倾向：${difficulty || '不限'}。补充要求：${extraPrompt || '适合家庭厨房，调料常见好买，步骤精炼'}`;

  const metaReply = await chatWithAi(
    aiSettings,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { json: true, temperature: 0.4, timeoutMs: 90000 }
  );

  let meta: AiRecipeGenResult;
  try {
    meta = parseJsonReply<AiRecipeGenResult>(metaReply);
  } catch {
    throw new AiError('AI 回复的用料方案格式解析失败，请重试');
  }

  const ingredients = (meta.ingredients || []).filter((i) => i?.name?.trim());

  // 第 2 段：食材已定稿，按清单编排步骤
  const steps = ingredients.length
    ? await requestStepsWithAi(aiSettings, {
        recipeName,
        ingredients,
        extraPrompt,
      })
    : [];

  // 闭环校验 + 一轮自动修复
  let unused = findUnusedIngredients(ingredients, steps);
  if (unused.length > 0 && steps.length > 0) {
    try {
      const repaired = await repairStepsWithAi(aiSettings, {
        recipeName,
        ingredients,
        steps,
        missing: unused,
      });
      if (repaired) {
        const fixed = findUnusedIngredients(ingredients, repaired);
        if (fixed.length < unused.length) {
          unused = fixed;
          steps.length = 0;
          steps.push(...repaired);
        }
      }
    } catch (err) {
      console.warn('AI 步骤自修复失败，保留原结果并提示用户:', err);
    }
  }

  return {
    ...meta,
    name: recipeName,
    ingredients,
    steps,
    warnings: unused.length > 0 ? { unusedIngredients: unused } : undefined,
  };
}

export async function generateRecipeWithAi(
  req: AiRecipeGenRequest
): Promise<AiRecipeGenResult> {
  // 支持外部传入配置（如 AI 试菜对比时临时替换模型）
  const aiSettings = req.aiSettings || useSettingsStore.getState().ai;
  const hasAiConfig = Boolean(
    aiSettings.baseUrl?.trim() && aiSettings.apiKey?.trim() && aiSettings.model?.trim()
  );

  if (!hasAiConfig && !req.aiSettings) {
    throw new AiError('请先前往「我的 → AI 助手配置」填写 API 接口与密钥，即可开启 AI 一键生成功能。');
  }

  // “一键完整食谱”改为两段式流水线：先定用料，再按用料闭环编排步骤。
  // 实测（用户反馈 + 模型行为）：一次性生成整份食谱时，小模型容易“食材×步骤两张皮”；
  // 先固定食材清单再写步骤的口碑明显更好，因此 all = ingredients → steps → 闭环校验。
  if (req.field === 'all') {
    return generateFullRecipeWithAi(aiSettings, req);
  }

  const { field, recipeName, cookTime, difficulty, currentIngredients, currentSteps, extraPrompt } = req;

  let systemPrompt = '你是一位专业的中西餐行政主厨，擅长撰写条理清晰、火候精确、通俗易懂的家庭烹饪食谱。';
  let userPrompt = '';

  if (field === 'description') {
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
    const stepsMessages = buildStepsMessages(recipeName, currentIngredients, extraPrompt);
    systemPrompt = stepsMessages[0].content;
    userPrompt = stepsMessages[1].content;
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
      // 结构化生成降低随机性，减少食材与步骤“两张皮”
      temperature: field === 'steps' ? 0.45 : 0.6,
      timeoutMs: 90000,
    }
  );

  if (field === 'description') {
    return { description: aiReply.replace(/^["'“”]|["'“”]$/g, '').trim() };
  }

  if (field === 'tips') {
    return { tips: aiReply.trim() };
  }

  let result: AiRecipeGenResult;
  try {
    result = parseJsonReply<AiRecipeGenResult>(aiReply);
  } catch (e) {
    throw new AiError('AI 回复的食谱格式解析失败，请重试');
  }

  // 食材-步骤闭环校验：单独生成步骤时，用当前清单核对
  if (field === 'steps' && currentIngredients?.length && result.steps?.length) {
    let unused = findUnusedIngredients(currentIngredients, result.steps);

    // 有一轮自动修复机会：让模型把漏用的食材写进步骤
    if (unused.length > 0) {
      try {
        const repaired = await repairStepsWithAi(aiSettings, {
          recipeName,
          ingredients: currentIngredients,
          steps: result.steps,
          missing: unused,
        });
        if (repaired) {
          result.steps = repaired;
          unused = findUnusedIngredients(currentIngredients, repaired);
        }
      } catch (err) {
        console.warn('AI 步骤自修复失败，保留原结果并提示用户:', err);
      }
    }

    if (unused.length > 0) {
      result.warnings = { unusedIngredients: unused };
    }
  }

  return result;
}
