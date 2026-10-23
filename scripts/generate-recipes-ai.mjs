/**
 * 分批调用 OpenAI 兼容接口生成菜谱，写入 mobile/src/data/generatedRecipes.ts。
 *
 * 用法：
 *   1. 复制 .env.recipe-gen.example 为 .env.recipe-gen，填写 AI_API_KEY
 *   2. bun run recipes:ai
 *
 * 可选参数：
 *   --count=900         目标生成总数（900 + 现有 133 条 ≈ 1033 条）
 *   --add=100           在现有生成结果上追加指定数量
 *   --focus=noodle      只生成面/粉专题（归入主食）
 *   --batch=10          每次请求生成的菜谱数
 *   --concurrency=2     并发请求数
 *   --force             清空已有生成结果，从头开始
 *
 * 生成过程中每完成一批都会落盘，中断后重新运行会自动续跑。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRecipes } from './covers-common.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const appDir = join(repoRoot, 'mobile');
const builtinRecipesPath = join(appDir, 'src', 'data', 'recipes.ts');
const generatedTsPath = join(appDir, 'src', 'data', 'generatedRecipes.ts');
const backupJsonPath = join(repoRoot, '.tmp', 'recipes', 'ai-recipes.json');
const envPath = join(repoRoot, '.env.recipe-gen');

const PROVIDERS = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-flash',
    thinking: 'disabled',
  },
  siliconflow: { baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-72B-Instruct' },
  dashscope: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  moonshot: { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-32k' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
};

const CATEGORY_PLAN = [
  {
    category: '家常菜',
    weight: 12,
    hints: ['快手家常菜', '下饭家常菜', '一人食', '家常蒸菜', '家常炖菜', '儿童友好的家常菜'],
  },
  {
    category: '肉类',
    weight: 10,
    hints: ['猪肉菜', '牛肉菜', '鸡肉菜', '羊肉菜', '卤味与酱肉', '煎炸烤肉类'],
  },
  {
    category: '蔬菜',
    weight: 9,
    hints: ['时令绿叶菜', '菌菇菜', '根茎类蔬菜', '凉拌菜', '素炒菜', '豆腐与豆制品'],
  },
  {
    category: '海鲜',
    weight: 8,
    hints: ['鱼类菜', '虾蟹菜', '贝类菜', '鱿鱼与章鱼', '清蒸海鲜', '香辣小海鲜'],
  },
  {
    category: '汤',
    weight: 8,
    hints: ['老火靓汤', '快手滚汤', '清炖汤', '酸辣汤羹', '西式浓汤', '养生药膳汤'],
  },
  {
    category: '主食',
    weight: 8,
    hints: ['米饭类', '面条类', '饺子馄饨', '饼类', '粉类', '杂粮主食'],
  },
  {
    category: '早餐',
    weight: 7,
    hints: ['粥品', '包子馒头', '煎饼与饼类', '快手三明治', '豆浆油条搭配', '营养早餐套餐'],
  },
  {
    category: '川菜',
    weight: 7,
    hints: ['经典川菜', '家常川菜', '江湖菜', '川式凉菜', '麻辣干锅', '川味小吃'],
  },
  {
    category: '粤菜',
    weight: 7,
    hints: ['广府家常菜', '潮汕菜', '客家菜', '粤式蒸菜', '粤式煲仔菜', '粤式点心'],
  },
  {
    category: '湘菜',
    weight: 5,
    hints: ['经典湘菜', '家常湘菜', '剁椒蒸菜', '腊味菜', '香辣小炒', '湘式干锅'],
  },
  {
    category: '鲁菜',
    weight: 4,
    hints: ['济南菜', '胶东海鲜菜', '孔府菜', '鲁式烧菜', '鲁式扒菜', '鲁式凉菜'],
  },
  {
    category: '西餐',
    weight: 5,
    hints: ['意面与烩饭', '牛排与烤肉', '沙拉', '西式浓汤', '烤箱菜', '早午餐'],
  },
  {
    category: '甜点',
    weight: 5,
    hints: ['中式点心', '西式烘焙', '蛋糕与慕斯', '糖水与甜品', '饼干与挞派', '低糖甜点'],
  },
  {
    category: '饮品',
    weight: 3,
    hints: ['茶饮', '果汁与果茶', '奶昔与冰沙', '咖啡饮品', '传统中式饮品', '养生热饮'],
  },
  {
    category: '调料',
    weight: 2,
    hints: ['蘸料', '复合酱汁', '腌料', '调味油', '火锅底料', '凉拌汁'],
  },
];

const NOODLE_HINTS = [
  '汤面', '拌面', '炒面', '烩面', '焖面', '凉面', '捞面', '卤面',
  '炸酱面', '热干面', '担担面', '重庆小面', '阳春面', '油泼面', '刀削面',
  '兰州牛肉面', '河南烩面', '新疆拌面', '广式云吞面', '沙茶面', '片儿川',
  '雪菜肉丝面', '番茄鸡蛋面', '葱油拌面', '麻酱拌面', '鸡丝凉面', '川北凉粉',
  '陕西凉皮', '汉中热米皮', '炒乌冬', '意面', '通心粉', '米线', '过桥米线',
  '小锅米线', '豆花米线', '酸辣粉', '螺蛳粉', '桂林米粉', '湖南米粉',
  '常德牛肉粉', '羊肉粉', '肥肠粉', '遵义羊肉粉', '河粉', '干炒牛河',
  '湿炒牛河', '潮汕粿条', '肠粉', '鸭血粉丝汤', '花甲粉丝', '酸汤粉',
  '砂锅米线', '鸡汤米线', '江西拌粉', '海南抱罗粉', '广西老友粉',
  '客家腌面', '宜宾燃面', '甜水面', '豌杂面', '鳝丝面', '大排面',
  '雪菜黄鱼面', '虾爆鳝面', '开洋葱油面', '贵州素粉', '绵阳米粉',
];

const FOCUS_PLANS = {
  noodle: [
    {
      category: '主食',
      weight: 100,
      focus: '面/粉',
      hints: NOODLE_HINTS,
    },
  ],
};

const VALID_CATEGORIES = Array.from(
  new Set([...CATEGORY_PLAN, ...Object.values(FOCUS_PLANS).flat()].map((p) => p.category))
);

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (!key) continue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (!match) continue;
    args[match[1]] = match[2] === undefined ? true : match[2];
  }
  return args;
}

function intEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function pickRandom(list, count) {
  if (list.length <= count) return [...list];
  const copy = [...list];
  shuffle(copy);
  return copy.slice(0, count);
}

function quote(value) {
  return `'${String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}'`;
}

function cleanName(value) {
  let name = String(value ?? '')
    .replace(/[\u200b\ufeff]/g, '')
    .trim();
  name = name.replace(/^[【[][^】\]]*[】\]]\s*/, '');
  name = name.replace(/^\d+\s*[.、．)）:：-]\s*/, '');
  name = name.replace(/^[一二三四五六七八九十]+\s*[.、．)）:：-]\s*/, '');
  name = name.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '');
  return name.replace(/\s+/g, '').trim();
}

function nameKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[\s·、，,。.;；:：()（）[\]【】"'“”‘’]/g, '');
}

function normalizeIngredients(input) {
  const result = [];
  const push = (item) => {
    if (typeof item === 'string') {
      const line = item.trim();
      if (!line) return;
      const parts = line.split(/[:：\s]+/);
      result.push({ name: parts[0] || line, amount: parts.slice(1).join(' ') || '适量' });
      return;
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const name = String(item.name ?? item.ingredient ?? item.title ?? '').trim();
    if (!name) return;
    const amount = String(item.amount ?? item.quantity ?? item.unit ?? '').trim() || '适量';
    result.push({ name, amount });
  };
  const collect = (value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (Array.isArray(item)) item.forEach(push);
        else push(item);
      });
      return;
    }
    if (typeof value === 'string') {
      value.split(/\r?\n/).forEach(push);
      return;
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value);
      const isMap =
        entries.length > 0 && entries.every(([, v]) => typeof v === 'string' || typeof v === 'number');
      if (isMap && !('name' in value)) {
        entries.forEach(([name, amount]) => {
          const clean = String(name).trim();
          if (clean) result.push({ name: clean, amount: String(amount).trim() || '适量' });
        });
        return;
      }
      Object.values(value).forEach(collect);
    }
  };
  collect(input);
  return result.filter((item) => item.name.length > 0).slice(0, 20);
}

function normalizeSteps(input) {
  const result = [];
  const push = (item) => {
    if (typeof item === 'string') {
      const text = item.trim();
      if (text.length >= 3) result.push(text);
      return;
    }
    if (!item || typeof item !== 'object') return;
    const text = String(item.description ?? item.content ?? item.text ?? item.desc ?? '').trim();
    if (text.length >= 3) result.push(text);
  };
  if (Array.isArray(input)) input.forEach(push);
  else if (typeof input === 'string') input.split(/\r?\n/).forEach(push);
  return result.slice(0, 12).map((description, index) => ({ order: index + 1, description }));
}

function normalizeDifficulty(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (['easy', '简单', '容易', '新手'].includes(text)) return 'easy';
  if (['hard', '困难', '进阶', '高难度'].includes(text)) return 'hard';
  return 'medium';
}

function normalizeTips(value) {
  if (typeof value === 'string') return value.trim().slice(0, 500);
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .slice(0, 4)
      .join('\n')
      .slice(0, 500);
  }
  return '';
}

function parseAiJson(text) {
  let body = String(text ?? '').trim();
  if (!body) throw new Error('AI 返回内容为空');
  body = body.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  const tryParse = (candidate) => {
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.recipes)) return parsed.recipes;
    if (Array.isArray(parsed?.data)) return parsed.data;
    if (parsed && typeof parsed === 'object') return [parsed];
    return null;
  };

  try {
    const direct = tryParse(body);
    if (direct) return direct;
  } catch {
    // 继续尝试截取 JSON 主体
  }

  const starts = [body.indexOf('['), body.indexOf('{')].filter((i) => i !== -1);
  const start = starts.length > 0 ? Math.min(...starts) : -1;
  const end = Math.max(body.lastIndexOf(']'), body.lastIndexOf('}'));
  if (start !== -1 && end > start) {
    const sliced = body.slice(start, end + 1);
    const parsed = tryParse(sliced);
    if (parsed) return parsed;
  }
  throw new Error('无法解析 AI 返回的 JSON');
}

function normalizeBatch(rawList, category, now, focus) {
  const accepted = [];
  for (const raw of rawList) {
    if (!raw || typeof raw !== 'object') continue;

    const name = cleanName(raw.name);
    if (name.length < 2 || name.length > 24) continue;
    if (/菜谱|示例|待定|未知|无标题|undefined|null/i.test(name)) continue;
    if (focus === '面/粉') {
      const isNoodle = /面|粉|米线|河粉|粉丝|粿条|凉皮|乌冬|意面|通心粉/.test(name);
      const isFalsePositive = /粉蒸|粉条?蒸|面粉/.test(name);
      if (!isNoodle || isFalsePositive) continue;
    }

    const description = String(raw.description ?? '').trim();
    if (description.length < 6) continue;

    const ingredients = normalizeIngredients(raw.ingredients);
    if (ingredients.length < 4) continue;

    const steps = normalizeSteps(raw.steps);
    if (steps.length < 3) continue;

    const cookTimeRaw = Number(raw.cookTime);
    const cookTime = Number.isFinite(cookTimeRaw) && cookTimeRaw > 0
      ? Math.min(600, Math.round(cookTimeRaw))
      : 20;

    accepted.push({
      id: '',
      name,
      category,
      coverImage: '',
      description: description.slice(0, 200),
      ingredients,
      steps,
      tips: normalizeTips(raw.tips),
      cookTime,
      difficulty: normalizeDifficulty(raw.difficulty),
      createdAt: now,
      updatedAt: now,
      aiGenerated: true,
    });
  }
  return accepted;
}

function serializeRecipe(recipe) {
  const ingredients = recipe.ingredients
    .map((item) => `      { name: ${quote(item.name)}, amount: ${quote(item.amount)} },`)
    .join('\n');
  const steps = recipe.steps
    .map(
      (step) =>
        `      { order: ${step.order}, description: ${quote(step.description)} },`
    )
    .join('\n');
  return `  {
    id: ${quote(recipe.id)},
    name: ${quote(recipe.name)},
    category: ${quote(recipe.category)},
    coverImage: ${quote(recipe.coverImage)},
    description: ${quote(recipe.description)},
    ingredients: [
${ingredients}
    ],
    steps: [
${steps}
    ],
    tips: ${quote(recipe.tips)},
    cookTime: ${recipe.cookTime},
    difficulty: ${quote(recipe.difficulty)},
    createdAt: ${quote(recipe.createdAt)},
    updatedAt: ${quote(recipe.updatedAt)},
    aiGenerated: true,
  }`;
}

function writeGenerated(recipes) {
  mkdirSync(dirname(generatedTsPath), { recursive: true });
  const body =
    recipes.length === 0
      ? 'export const generatedRecipes: Recipe[] = [];\n'
      : `export const generatedRecipes: Recipe[] = [\n${recipes
          .map(serializeRecipe)
          .join(',\n')}\n];\n`;
  const content =
    `import { Recipe } from '../types';\n\n` +
    `// 本文件由 scripts/generate-recipes-ai.mjs 自动生成，请勿手改。\n` +
    `// 重新生成：bun run recipes:ai（支持中断续跑）。\n\n` +
    body;
  writeFileSync(generatedTsPath, content, 'utf8');
}

function writeBackup(recipes) {
  mkdirSync(dirname(backupJsonPath), { recursive: true });
  writeFileSync(backupJsonPath, JSON.stringify(recipes, null, 2), 'utf8');
}

function loadGenerated() {
  if (!existsSync(backupJsonPath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(backupJsonPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildMessages(categoryPlan, count, existingNames, generatedNames) {
  const avoid = pickRandom([...existingNames, ...generatedNames], 100);
  const hint = categoryPlan.hints[Math.floor(Math.random() * categoryPlan.hints.length)];
  const category = categoryPlan.category;
  const focusLine = categoryPlan.focus
    ? `6. 本批是「${categoryPlan.focus}」专题：菜名必须包含面、粉、米线、河粉、粉丝、粿条、凉皮、意面或乌冬等字样，且必须是完整的主食；严禁生成米饭、粥、包子、馒头、饺子等非面/粉类。`
    : '';

  const system = `你是一位资深菜谱编辑，擅长设计真实、可操作、口味可靠的中式与西式菜谱。
你的任务是按要求输出菜谱 JSON，供菜谱 App 直接展示。

输出必须是一个 JSON 对象：{"recipes": [...]}，不要 markdown 代码块，不要任何解释。
每个菜谱对象的字段：
- name：菜名，2-12 个汉字，具体、真实，不要序号、不要书名号或引号；
- category：严格填写 "${category}"；
- description：20-40 字，说明风味特点或适合场景；
- cookTime：整数，单位为分钟，范围 5-300；
- difficulty：只能是 "easy"、"medium"、"hard" 之一；
- ingredients：5-12 项，每项 {"name":"食材或调料名","amount":"带单位的分量，如 300g、2 勺、适量"}；
- steps：4-8 项，每项 {"order":序号,"description":"具体操作，包含火候、时间或状态判断"}；
- tips：1-3 条关键诀窍，用换行分隔，没有则填空字符串。

质量要求：
1. 菜名必须是真实存在或合理可做的家常菜，禁止编造离谱菜名；
2. 步骤必须能照着做，禁止“炒熟即可”“加入适量调料”这类空话；
3. 食材分量要合理，步骤中出现的调料应在食材里列出；
4. 本批全部为「${category}」分类，子方向参考：${hint}；
5. 不要与以下已有菜名重复：${avoid.join('、') || '无'}。${focusLine ? `\n${focusLine}` : ''}`;

  return [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `请生成 ${count} 道${categoryPlan.focus ? `「${categoryPlan.focus}」` : `「${category}」`}菜谱，只输出 {"recipes":[...]}。`,
    },
  ];
}

async function callAi(messages, config) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.85,
        top_p: 0.9,
        max_tokens: config.maxTokens,
        stream: false,
        ...(config.thinking ? { thinking: { type: config.thinking } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const error = new Error(`HTTP ${response.status}: ${text.slice(0, 400)}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI 返回缺少 message.content');
    return { content, usage: data?.usage };
  } finally {
    clearTimeout(timer);
  }
}

async function callAiWithRetry(messages, config, label) {
  const delays = [2000, 6000, 15000, 30000, 60000];
  let lastError;
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await callAi(messages, config);
    } catch (error) {
      lastError = error;
      if (error.status === 401 || error.status === 403) {
        throw new Error(`鉴权失败（HTTP ${error.status}），请检查 AI_API_KEY 与 AI_BASE_URL`);
      }
      if (error.status === 400 && /max_tokens/i.test(error.message)) {
        throw error;
      }
      if (attempt < delays.length) {
        const wait = delays[attempt];
        console.warn(`  [${label}] 请求失败：${error.message}，${wait / 1000}s 后重试`);
        await sleep(wait);
      }
    }
  }
  throw lastError;
}

async function main() {
  loadEnvFile(envPath);

  const args = parseArgs(process.argv.slice(2));
  const providerName = String(process.env.AI_PROVIDER ?? 'deepseek').trim().toLowerCase();
  const provider = PROVIDERS[providerName] ?? PROVIDERS.deepseek;

  const focusKey = String(args.focus ?? process.env.RECIPE_FOCUS ?? '').trim().toLowerCase();
  const planList = focusKey ? FOCUS_PLANS[focusKey] : CATEGORY_PLAN;
  if (focusKey && !planList) {
    throw new Error(`未知专题 "${focusKey}"，可选：${Object.keys(FOCUS_PLANS).join('、')}`);
  }

  const apiKey = String(process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? '').trim();
  const baseUrl = String(process.env.AI_BASE_URL ?? provider.baseUrl).trim();
  const model = String(process.env.AI_MODEL ?? provider.model).trim();
  const thinking = String(process.env.AI_THINKING ?? provider.thinking ?? 'disabled')
    .trim()
    .toLowerCase();
  let target = Number(args.count ?? intEnv('RECIPE_COUNT', 900));
  const addCount = Number(args.add ?? intEnv('RECIPE_ADD', 0));
  const batch = Number(args.batch ?? intEnv('RECIPE_BATCH', 10));
  const concurrency = Number(args.concurrency ?? intEnv('RECIPE_CONCURRENCY', 2));
  const maxTokens = intEnv('AI_MAX_TOKENS', 8192);

  if (!Number.isFinite(target) || target < 1) throw new Error('RECIPE_COUNT 必须是正整数');
  if (!Number.isFinite(addCount) || addCount < 0) throw new Error('--add 必须是非负整数');
  if (!Number.isFinite(batch) || batch < 1 || batch > 30) {
    throw new Error('RECIPE_BATCH 必须是 1-30 的整数');
  }
  if (!apiKey) {
    console.error(
      [
        '缺少 AI_API_KEY。',
        '',
        `请创建 ${envPath}，内容示例：`,
        '  AI_PROVIDER=deepseek',
        '  AI_API_KEY=sk-xxxxxxxxxxxxxxxx',
        '',
        '也可以直接设置环境变量后运行：',
        '  $env:AI_API_KEY="sk-..."; bun run recipes:ai',
      ].join('\n')
    );
    process.exitCode = 1;
    return;
  }

  const builtinNames = parseRecipes(readFileSync(builtinRecipesPath, 'utf8')).map((r) => r.name);
  let generated = args.force ? [] : loadGenerated();

  if (addCount > 0) {
    target = generated.length + Math.floor(addCount);
  }

  if (args.force) {
    console.log('已启用 --force，清空历史生成结果。');
    writeBackup([]);
    writeGenerated([]);
  }

  const existingKeys = new Set([...builtinNames, ...generated.map((r) => r.name)].map(nameKey));
  const acceptedByCategory = {};
  for (const recipe of generated) {
    acceptedByCategory[recipe.category] = (acceptedByCategory[recipe.category] || 0) + 1;
  }

  if (generated.length > 0) {
    console.log(`检测到已有生成结果 ${generated.length} 条，将自动续跑。`);
  }

  const quotaByCategory = {};
  for (const plan of planList) {
    quotaByCategory[plan.category] = Math.round((plan.weight / 100) * target);
  }

  console.log(
    [
      `目标：${target} 条（当前已有 ${generated.length} 条，本次新增 ${Math.max(0, target - generated.length)} 条）`,
      `专题：${focusKey ? focusKey : '综合'}`,
      `模型：${model}`,
      `接口：${baseUrl}`,
      `思考模式：${thinking === 'enabled' ? '开启（更贵）' : '关闭'}`,
      `批次：${batch} 条/请求，并发 ${concurrency}`,
      `已有菜名：${existingKeys.size} 个（用于去重）`,
      '',
    ].join('\n')
  );

  let nextId = generated.length + 1;
  let totalRequests = 0;
  let totalTokens = 0;
  let fatalError = null;

  const buildQueue = () => {
    const queue = [];
    for (const plan of planList) {
      const quota = Math.max(0, quotaByCategory[plan.category] - (acceptedByCategory[plan.category] || 0));
      const tasks = Math.ceil(quota / batch);
      for (let i = 0; i < tasks; i += 1) queue.push(plan);
    }
    return shuffle(queue);
  };

  for (let round = 0; round < 8; round += 1) {
    if (generated.length >= target || fatalError) break;

    const queue = buildQueue();
    if (queue.length === 0) break;
    let cursor = 0;

    const worker = async () => {
      while (!fatalError && generated.length < target) {
        const index = cursor;
        cursor += 1;
        if (index >= queue.length) return;
        if (generated.length >= target) return;

        const plan = queue[index];
        const label = `${plan.category}#${totalRequests + 1}`;
        totalRequests += 1;

        try {
          const existingNames = [...builtinNames, ...generated.map((r) => r.name)];
          const generatedNames = generated.slice(-80).map((r) => r.name);
          const messages = buildMessages(plan, batch, existingNames, generatedNames);
          const { content, usage } = await callAiWithRetry(messages, {
            apiKey,
            baseUrl,
            model,
            maxTokens,
            thinking: thinking === 'enabled' ? 'enabled' : 'disabled',
            timeoutMs: 180000,
          }, label);

          if (usage?.total_tokens) totalTokens += usage.total_tokens;

          const rawList = parseAiJson(content);
          const normalized = normalizeBatch(rawList, plan.category, new Date().toISOString(), plan.focus);
          const accepted = [];

          for (const recipe of normalized) {
            const key = nameKey(recipe.name);
            if (!key || existingKeys.has(key)) continue;
            existingKeys.add(key);
            recipe.id = `gen${String(nextId).padStart(4, '0')}`;
            nextId += 1;
            accepted.push(recipe);
          }

          if (accepted.length === 0) {
            console.warn(`  [${label}] 无有效新菜谱（返回 ${rawList.length} 条，可能重复或质量不足）`);
            continue;
          }

          generated.push(...accepted);
          acceptedByCategory[plan.category] =
            (acceptedByCategory[plan.category] || 0) + accepted.length;
          writeBackup(generated);
          writeGenerated(generated);

          console.log(
            `  [${label}] +${accepted.length}，累计 ${generated.length}/${target}（${plan.category} ${acceptedByCategory[plan.category]}/${quotaByCategory[plan.category]}）`
          );
        } catch (error) {
          if (/鉴权失败/.test(error.message)) {
            fatalError = error;
            return;
          }
          console.warn(`  [${label}] 跳过：${error.message}`);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  }

  writeBackup(generated);
  writeGenerated(generated);

  console.log('');
  console.log(`完成：共 ${generated.length} 条生成菜谱，写入 ${generatedTsPath}`);
  console.log(`请求 ${totalRequests} 次，累计 tokens ${totalTokens}`);
  console.log('分类统计：');
  for (const plan of planList) {
    console.log(
      `  ${plan.category}：${acceptedByCategory[plan.category] || 0} 条（目标 ${quotaByCategory[plan.category]}）`
    );
  }

  if (fatalError) throw fatalError;
  if (generated.length < target) {
    console.warn(`未达到目标数量，还差 ${target - generated.length} 条，可再次运行继续补齐。`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`生成失败：${error.message}`);
  process.exitCode = 1;
});
