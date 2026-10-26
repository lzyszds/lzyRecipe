import { Recipe } from '@/types';

/**
 * 菜谱搜索工具
 *
 * 相比最朴素的“名称/分类/食材 includes”，这里补上了几个真实使用场景：
 * 1. 等价同义词：西红柿 ↔ 番茄、土豆 ↔ 马铃薯、生粉 ↔ 淀粉……
 * 2. 宽泛词下钻：搜“猪肉”能找到五花肉/肉末，“牛肉”能找到牛腩/肥牛；
 *    但搜“五花肉”“牛腩”时保持精准，不会把所有猪肉/牛肉菜都混进来。
 * 3. 多关键词：支持“番茄 鸡蛋”这种空格分隔的 AND 搜索。
 * 4. 连写拆分：搜“番茄鸡蛋”没有整词结果时，自动拆成“番茄 + 鸡蛋”。
 * 5. 相关度排序：菜名命中 > 食材命中 > 分类命中 > 描述/贴士命中。
 * 6. 模糊兜底：精准搜索无结果时，按“字符覆盖率 / 顺序包含”给出相近菜谱。
 */

export interface SearchHit {
  recipe: Recipe;
  score: number;
  matchedInName: boolean;
  matchedIngredient?: string;
  matchedCategory: boolean;
  matchedDescription: boolean;
}

export type SearchMode = 'exact' | 'fuzzy' | 'empty';

export interface SearchResult {
  hits: SearchHit[];
  mode: SearchMode;
  tokens: string[];
}

/** 等价同义词组：组内任意一个词都能互相替换，第一项作为统一归一化词 */
const EQUIVALENT_GROUPS: string[][] = [
  ['西红柿', '番茄', '蕃茄'],
  ['土豆', '马铃薯', '洋芋', '薯仔'],
  ['鸡翅', '翅中', '鸡中翅', '鸡翼'],
  ['鸡蛋', '蛋液', '鸡蛋液'],
  ['豆腐', '豆付', '嫩豆腐', '老豆腐', '内酯豆腐'],
  ['淀粉', '生粉', '玉米淀粉', '土豆淀粉', '红薯淀粉'],
  ['酱油', '生抽', '老抽', '豉油'],
  ['料酒', '黄酒', '米酒', '绍酒', '花雕酒'],
  ['茄子', '长茄子', '圆茄子'],
  ['排骨', '肋排', '小排', '仔排'],
  ['青椒', '尖椒', '杭椒', '螺丝椒'],
  ['虾', '大虾', '鲜虾', '虾仁', '基围虾', '明虾', '河虾', '虾米'],
  ['螃蟹', '青蟹', '肉蟹', '大闸蟹', '梭子蟹'],
  ['鸡胸肉', '鸡胸', '鸡脯肉'],
  ['香菜', '芫荽'],
  ['卷心菜', '包菜', '圆白菜', '甘蓝'],
  ['西葫芦', '角瓜'],
  ['红薯', '地瓜', '番薯'],
  ['山药', '淮山'],
  ['苦瓜', '凉瓜'],
  ['栗子', '板栗'],
  ['花生', '花生米'],
  ['香菇', '冬菇'],
  ['千张', '豆皮', '豆腐皮'],
  ['腐竹', '豆筋'],
  ['洋葱', '圆葱', '葱头'],
  ['柠檬', '青柠'],
];

/**
 * 宽泛词 → 细分食材：
 * 只有当用户搜索“组内第一项”（宽泛词）时，才向下匹配细分食材。
 * 例如搜“猪肉”能命中五花肉，搜“五花肉”不会被扩展成所有猪肉菜。
 */
const FAMILY_GROUPS: string[][] = [
  ['猪肉', '五花肉', '里脊肉', '肉末', '肉馅', '肉丝', '肉片', '肉沫', '梅花肉'],
  ['牛肉', '牛腩', '牛里脊', '肥牛', '牛腱', '牛柳', '牛霖'],
  ['羊肉', '羊腿肉', '羊排', '羊腩'],
  ['鸡肉', '鸡腿', '鸡翅', '鸡胸肉', '整鸡', '鸡块'],
  ['辣椒', '青椒', '尖椒', '杭椒', '螺丝椒', '小米辣', '干辣椒', '泡椒', '剁椒'],
  ['蘑菇', '香菇', '冬菇', '口蘑', '平菇', '金针菇', '杏鲍菇', '菌菇'],
  ['面条', '挂面', '拉面', '意面', '面片', '刀削面', '乌冬面'],
  ['米饭', '大米', '剩米饭'],
  ['大蒜', '蒜', '蒜头', '蒜瓣', '蒜末', '蒜蓉'],
  ['生姜', '姜', '老姜', '姜片', '姜末', '姜丝'],
  ['香葱', '小葱', '葱花', '葱'],
  ['白糖', '砂糖', '冰糖', '红糖', '糖'],
];

const NORMALIZE_PUNCTUATION =
  /[\s\u3000·・、,，。.：:；;（）()【】\[\]{}!！?？'"“”‘’/\\|_+*~`@#$%^&—–-]/g;

export function normalizeText(input: string): string {
  return String(input || '')
    .replace(/[\uFF01-\uFF5E]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    )
    .toLowerCase()
    .replace(NORMALIZE_PUNCTUATION, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface SynonymPair {
  from: string;
  to: string;
}

const synonymPairs: SynonymPair[] = [];
for (const group of EQUIVALENT_GROUPS) {
  const canonical = normalizeText(group[0]);
  for (let i = 1; i < group.length; i++) {
    const from = normalizeText(group[i]);
    if (from.length >= 2 && from !== canonical) {
      synonymPairs.push({ from, to: canonical });
    }
  }
}
synonymPairs.sort((a, b) => b.from.length - a.from.length);

const synonymRegex = new RegExp(
  synonymPairs.map((pair) => escapeRegExp(pair.from)).join('|'),
  'g'
);
const synonymMap = new Map(synonymPairs.map((pair) => [pair.from, pair.to]));

const familyLookup = new Map<string, string[]>();
for (const group of FAMILY_GROUPS) {
  const normalizedGroup = group.map((member) => normalizeText(member));
  for (const member of normalizedGroup) {
    familyLookup.set(member, normalizedGroup);
  }
}

/** 把等价同义词统一成同一个词，便于“西红柿”搜索到“番茄” */
export function canonicalize(input: string): string {
  const normalized = normalizeText(input);
  if (!normalized || synonymMap.size === 0) return normalized;
  return normalized.replace(synonymRegex, (word) => synonymMap.get(word) || word);
}

/**
 * 宽泛词才向下扩展；细分词保持精准。
 * 例：猪肉 → [五花肉, 里脊肉, 肉末...]；五花肉 → []
 */
function getFamilyVariants(token: string): string[] {
  const group = familyLookup.get(token);
  if (!group) return [];
  if (token !== group[0] && token.length > 1) return [];
  return group.filter((member) => member !== token);
}

/** 将搜索词拆成多关键词（支持空格、逗号、顿号等分隔） */
export function tokenizeQuery(query: string): string[] {
  const rawTokens = String(query || '')
    .split(/[\s\u3000,，、;；/|+＋]+/)
    .map((token) => normalizeText(token))
    .filter(Boolean);

  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const token of rawTokens) {
    if (!seen.has(token)) {
      seen.add(token);
      tokens.push(token);
    }
  }
  return tokens;
}

interface PreparedRecipe {
  recipe: Recipe;
  rawName: string;
  name: string;
  ingredients: { raw: string; canonical: string }[];
  canonicalIngredientText: string;
  rawCategory: string;
  category: string;
  rawDescription: string;
  description: string;
  rawTips: string;
  tips: string;
}

const preparedCache = new WeakMap<Recipe, PreparedRecipe>();

function prepareRecipe(recipe: Recipe): PreparedRecipe {
  const cached = preparedCache.get(recipe);
  if (cached) return cached;

  const ingredients = (recipe.ingredients || []).map((ingredient) => ({
    raw: normalizeText(ingredient.name),
    canonical: canonicalize(ingredient.name),
  }));

  const prepared: PreparedRecipe = {
    recipe,
    rawName: normalizeText(recipe.name),
    name: canonicalize(recipe.name),
    ingredients,
    canonicalIngredientText: ingredients.map((item) => item.canonical).join('|'),
    rawCategory: normalizeText(recipe.category || ''),
    category: canonicalize(recipe.category || ''),
    rawDescription: normalizeText(recipe.description || ''),
    description: canonicalize(recipe.description || ''),
    rawTips: normalizeText(recipe.tips || ''),
    tips: canonicalize(recipe.tips || ''),
  };

  preparedCache.set(recipe, prepared);
  return prepared;
}

function matchIngredient(
  prepared: PreparedRecipe,
  token: string,
  canonicalToken: string,
  familyVariants: string[]
): { rawName?: string; score: number } | null {
  const exact = prepared.ingredients.find((item) => item.raw === token);
  if (exact) return { rawName: exact.raw, score: 70 };

  const partial = prepared.ingredients.find((item) => item.raw.includes(token));
  if (partial) return { rawName: partial.raw, score: 58 };

  // 等价同义词（西红柿 ↔ 番茄）
  if (canonicalToken !== token) {
    const synonym = prepared.ingredients.find((item) =>
      item.canonical.includes(canonicalToken)
    );
    if (synonym) return { rawName: synonym.raw, score: 46 };
  }

  // 宽泛词下钻（猪肉 → 五花肉）
  if (familyVariants.length > 0) {
    const family = prepared.ingredients.find((item) =>
      familyVariants.some((variant) => item.raw.includes(variant))
    );
    if (family) return { rawName: family.raw, score: 36 };
  }

  return null;
}

/**
 * 精准搜索：所有关键词都要命中（AND 语义），并给出相关度分数。
 */
function scorePreparedRecipe(
  prepared: PreparedRecipe,
  tokens: string[],
  canonicalQuery: string,
  rawQuery: string
): SearchHit | null {
  let score = 0;
  let matchedInName = false;
  let matchedIngredient: string | undefined;
  let matchedCategory = false;
  let matchedDescription = false;

  for (const token of tokens) {
    const canonicalToken = canonicalize(token);
    const familyVariants = getFamilyVariants(token);
    let tokenMatched = false;

    // 1. 菜名命中（原始词权重最高）
    const rawNameIndex = prepared.rawName.indexOf(token);
    if (rawNameIndex >= 0) {
      tokenMatched = true;
      matchedInName = true;
      if (prepared.rawName === token) {
        score += 240;
      } else if (rawNameIndex === 0) {
        score += 175;
      } else {
        score += 130;
      }
    } else {
      const canonicalNameIndex = prepared.name.indexOf(canonicalToken);
      if (canonicalNameIndex >= 0) {
        tokenMatched = true;
        matchedInName = true;
        score += canonicalNameIndex === 0 ? 140 : 105;
      } else if (
        familyVariants.some((variant) => prepared.rawName.includes(variant))
      ) {
        tokenMatched = true;
        matchedInName = true;
        score += 85;
      }
    }

    // 2. 食材命中
    const ingredientMatch = matchIngredient(
      prepared,
      token,
      canonicalToken,
      familyVariants
    );
    if (ingredientMatch) {
      tokenMatched = true;
      score += ingredientMatch.score;
      if (!matchedIngredient) matchedIngredient = ingredientMatch.rawName;
    }

    // 3. 分类命中
    if (prepared.rawCategory === token) {
      tokenMatched = true;
      matchedCategory = true;
      score += 55;
    } else if (
      prepared.category === canonicalToken ||
      prepared.rawCategory.includes(token)
    ) {
      tokenMatched = true;
      matchedCategory = true;
      score += 34;
    }

    // 4. 描述 / 贴士命中（用于“香辣”“下饭”这类口味搜索）
    if (
      prepared.rawDescription.includes(token) ||
      (canonicalToken !== token && prepared.description.includes(canonicalToken))
    ) {
      tokenMatched = true;
      matchedDescription = true;
      score += 14;
    }
    if (
      prepared.rawTips.includes(token) ||
      (canonicalToken !== token && prepared.tips.includes(canonicalToken))
    ) {
      tokenMatched = true;
      matchedDescription = true;
      score += 7;
    }

    // AND 语义：有一个关键词完全找不到，就舍弃该菜谱
    if (!tokenMatched) return null;
  }

  const rawNameBonus = rawQuery ? prepared.rawName.includes(rawQuery) : false;
  const canonicalNameBonus =
    canonicalQuery && canonicalQuery !== rawQuery
      ? prepared.name.includes(canonicalQuery)
      : false;

  if (rawNameBonus) {
    score += 90;
    if (prepared.rawName.startsWith(rawQuery)) score += 45;
    if (prepared.rawName === rawQuery) score += 120;
  } else if (canonicalNameBonus) {
    score += 70;
    if (prepared.name.startsWith(canonicalQuery)) score += 35;
  }

  // 同名命中时，菜名越短越精准
  score -= Math.min(18, prepared.rawName.length * 0.2);

  return {
    recipe: prepared.recipe,
    score,
    matchedInName,
    matchedIngredient,
    matchedCategory,
    matchedDescription,
  };
}

/** 判断 a 是否为 b 的子序列（允许漏字，如“红烧肉”命中“红烧五花肉”） */
function isSubsequence(a: string, b: string): boolean {
  let cursor = 0;
  for (const char of b) {
    if (char === a[cursor]) cursor++;
    if (cursor >= a.length) return true;
  }
  return a.length === 0;
}

/** 精准搜索无结果时的相近结果兜底 */
function buildFuzzyHits(
  recipes: Recipe[],
  query: string,
  tokens: string[]
): SearchHit[] {
  const canonicalQuery = canonicalize(tokens.join(''));
  if (canonicalQuery.length < 2) return [];

  const queryChars = Array.from(new Set(canonicalQuery.split('')));
  const threshold =
    canonicalQuery.length <= 3 ? 0.66 : canonicalQuery.length <= 5 ? 0.6 : 0.55;

  const hits: SearchHit[] = [];

  for (const recipe of recipes) {
    const prepared = prepareRecipe(recipe);
    const nameChars = new Set(`${prepared.rawName}${prepared.name}`.split(''));
    const ingredientChars = new Set(
      `${prepared.ingredients.map((item) => item.raw).join('|')}${prepared.canonicalIngredientText}`.split(
        ''
      )
    );

    let nameCoverage = 0;
    for (const char of queryChars) {
      if (nameChars.has(char)) nameCoverage++;
    }
    nameCoverage /= queryChars.length;

    let ingredientCoverage = 0;
    for (const char of queryChars) {
      if (ingredientChars.has(char)) ingredientCoverage++;
    }
    ingredientCoverage /= queryChars.length;

    const coverage = Math.max(nameCoverage, ingredientCoverage);
    const orderedNameMatch =
      isSubsequence(canonicalQuery, prepared.name) ||
      isSubsequence(canonicalQuery, prepared.rawName);

    if (!orderedNameMatch && coverage < threshold) continue;

    const score =
      (orderedNameMatch ? 90 : 0) +
      nameCoverage * 80 +
      ingredientCoverage * 35 +
      (prepared.name.includes(canonicalQuery) ? 25 : 0);

    hits.push({
      recipe,
      score,
      matchedInName: nameCoverage > 0,
      matchedIngredient:
        ingredientCoverage > 0 ? prepared.ingredients[0]?.raw : undefined,
      matchedCategory: prepared.category.includes(canonicalQuery),
      matchedDescription: false,
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, 60);
}

/** 常见做法 / 口味词，用于“红烧牛肉”这类连写词的分词 */
const METHOD_WORDS = [
  '红烧',
  '清蒸',
  '粉蒸',
  '凉拌',
  '小炒',
  '爆炒',
  '干煸',
  '糖醋',
  '麻辣',
  '香辣',
  '蒜蓉',
  '酱烧',
  '清炖',
  '慢炖',
];

/** 从菜谱语料 + 内置词表构建分词词典，保证拆出来的都是真实存在的词 */
function buildVocabulary(recipes: Recipe[]): Set<string> {
  const vocabulary = new Set<string>();

  const add = (word: string) => {
    const normalized = normalizeText(word);
    if (normalized.length >= 2) vocabulary.add(normalized);
  };

  for (const recipe of recipes) {
    add(recipe.category || '');
    (recipe.ingredients || []).forEach((ingredient) => add(ingredient.name));
  }
  EQUIVALENT_GROUPS.flat().forEach(add);
  FAMILY_GROUPS.flat().forEach(add);
  METHOD_WORDS.forEach(add);

  return vocabulary;
}

/** 把连写词按词典切成两段，如“番茄鸡蛋” → [番茄, 鸡蛋] */
function splitCompoundToken(
  token: string,
  vocabulary: Set<string>
): string[] | null {
  if (token.length < 4) return null;

  for (let index = 2; index <= token.length - 2; index++) {
    const head = token.slice(0, index);
    const tail = token.slice(index);
    if (vocabulary.has(head) && vocabulary.has(tail)) {
      return [head, tail];
    }
  }
  return null;
}

function expandCompoundTokens(
  tokens: string[],
  vocabulary: Set<string>
): string[] | null {
  const expanded: string[] = [];
  let changed = false;

  for (const token of tokens) {
    const parts = splitCompoundToken(token, vocabulary);
    if (parts) {
      expanded.push(...parts);
      changed = true;
    } else {
      expanded.push(token);
    }
  }

  if (!changed) return null;

  const seen = new Set<string>();
  return expanded.filter((token) => {
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
}

function collectExactHits(
  recipes: Recipe[],
  tokens: string[]
): SearchHit[] {
  const canonicalQuery = canonicalize(tokens.join(''));
  const rawQuery = tokens.join('');
  const hits: SearchHit[] = [];

  for (const recipe of recipes) {
    const prepared = prepareRecipe(recipe);
    const hit = scorePreparedRecipe(prepared, tokens, canonicalQuery, rawQuery);
    if (hit) hits.push(hit);
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.recipe.cookTime || 0) - (b.recipe.cookTime || 0);
  });
  return hits;
}

export function searchRecipes(recipes: Recipe[], query: string): SearchResult {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return { hits: [], mode: 'empty', tokens };
  }

  let effectiveTokens = tokens;
  let hits = collectExactHits(recipes, tokens);

  // 连写兜底：搜“番茄鸡蛋”时先尝试拆成“番茄 + 鸡蛋”再做 AND 匹配
  if (hits.length === 0) {
    const expanded = expandCompoundTokens(tokens, buildVocabulary(recipes));
    if (expanded) {
      const expandedHits = collectExactHits(recipes, expanded);
      if (expandedHits.length > 0) {
        effectiveTokens = expanded;
        hits = expandedHits;
      }
    }
  }

  if (hits.length > 0) {
    return { hits, mode: 'exact', tokens: effectiveTokens };
  }

  const fuzzyHits = buildFuzzyHits(recipes, query, tokens);
  return {
    hits: fuzzyHits,
    mode: fuzzyHits.length > 0 ? 'fuzzy' : 'empty',
    tokens,
  };
}

/** 给搜索结果补充一行“为什么匹配”的说明 */
export function getMatchLabel(hit: SearchHit): string | null {
  if (hit.matchedInName) return '菜名匹配';
  if (hit.matchedIngredient) return `食材 · ${hit.matchedIngredient}`;
  if (hit.matchedCategory) return `分类 · ${hit.recipe.category}`;
  if (hit.matchedDescription) return '口味 / 做法匹配';
  return null;
}
