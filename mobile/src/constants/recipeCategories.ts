/**
 * 应用统一的菜谱分类体系（编辑器、AI 生成/解析、筛选共用）
 *
 * 设计：双轴体系
 * 1. 主分类（单选）：纯粹的「菜系 / 形态」轴，决定这道菜"是什么"
 * 2. 特性标签（多选）：「食材荤素 / 用时 / 场景」轴，决定这道菜"适合谁、什么时候做"
 *
 * 旧版把菜系、食材、餐段、场景混在一个 category 字段里（如"海鲜""调料"既不是菜系也不是场景），
 * 现统一拆分为 category + tags，旧数据通过 LEGACY_CATEGORY_MAP + inferRecipeTags 自动迁移。
 */

/** 主分类（单选） */
export const RECIPE_CATEGORIES = [
  '家常菜',
  '川菜',
  '湘菜',
  '粤菜',
  '鲁菜',
  '西餐',
  '汤羹',
  '主食',
  '甜点',
  '饮品',
  '早餐',
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

/** 特性标签（多选） */
export const RECIPE_TAGS = [
  '荤菜',
  '素菜',
  '海鲜',
  '快手菜',
  '减脂餐',
  '下饭菜',
  '宴客菜',
  '夜宵',
] as const;

export type RecipeTag = (typeof RECIPE_TAGS)[number];

/** 标签数量上限（防 AI/迁移乱塞） */
export const MAX_RECIPE_TAGS = 4;

/**
 * 旧分类 → 新体系映射（一次性迁移用）
 * 食材轴旧分类（海鲜/肉类/蔬菜）归入家常菜，由标签承接筛选能力
 */
export const LEGACY_CATEGORY_MAP: Record<string, { category: string; tags: string[] }> = {
  家常菜: { category: '家常菜', tags: [] },
  川菜: { category: '川菜', tags: ['下饭菜'] },
  湘菜: { category: '湘菜', tags: ['下饭菜'] },
  粤菜: { category: '粤菜', tags: [] },
  鲁菜: { category: '鲁菜', tags: [] },
  西餐: { category: '西餐', tags: [] },
  汤: { category: '汤羹', tags: [] },
  汤羹: { category: '汤羹', tags: [] },
  主食: { category: '主食', tags: [] },
  甜点: { category: '甜点', tags: [] },
  饮品: { category: '饮品', tags: [] },
  早餐: { category: '早餐', tags: [] },
  海鲜: { category: '家常菜', tags: ['海鲜', '荤菜'] },
  肉类: { category: '家常菜', tags: ['荤菜'] },
  蔬菜: { category: '家常菜', tags: ['素菜'] },
  调料: { category: '家常菜', tags: [] },
};

/**
 * 模糊分类输入归一（兼容 AI 自由发挥的分类词，如"川蜀菜""煲汤""粤式"）
 */
export function normalizeCategoryInput(raw: string): string {
  const c = (raw || '').trim();
  if (!c) return '家常菜';
  if (RECIPE_CATEGORIES.includes(c as RecipeCategory)) return c;
  if (c.includes('川')) return '川菜';
  if (c.includes('湘')) return '湘菜';
  if (c.includes('粤') || c.includes('广')) return '粤菜';
  if (c.includes('鲁')) return '鲁菜';
  if (c.includes('西') || c.includes('意') || c.includes('法')) return '西餐';
  if (c.includes('汤') || c.includes('煲') || c.includes('炖')) return '汤羹';
  if (c.includes('面') || c.includes('饭') || c.includes('粉') || c.includes('主食') || c.includes('饺子') || c.includes('包'))
    return '主食';
  if (c.includes('甜') || c.includes('点心') || c.includes('烘焙') || c.includes('蛋糕'))
    return '甜点';
  if (c.includes('饮') || c.includes('奶') || c.includes('茶') || c.includes('汁') || c.includes('咖啡'))
    return '饮品';
  if (c.includes('早') || c.includes('粥')) return '早餐';
  if (c.includes('海鲜') || c.includes('鱼') || c.includes('虾')) return '家常菜';
  if (c.includes('肉')) return '家常菜';
  if (c.includes('素') || c.includes('菜')) return '家常菜';
  return '家常菜';
}

/**
 * 从菜谱内容自动推断特性标签（保守规则，宁缺勿滥）
 */
export function inferRecipeTags(input: {
  name?: string;
  description?: string;
  cookTime?: number;
  ingredients?: { name: string; amount?: string }[];
  category?: string;
}): string[] {
  const name = input.name || '';
  const desc = input.description || '';
  const ingredientText = (input.ingredients || []).map((i) => i?.name || '').join(' ');
  const text = `${name} ${desc} ${ingredientText}`;
  const tags: string[] = [];

  const isSeafood = /虾|蟹|鱼|贝|鲍|鱿|蛤|蛏|蚝|扇贝|海蛎|三文鱼|鳕鱼|龙虾/.test(
    // 「鱼香」是味型不是食材，先剔除再判断
    ingredientText || text.replace(/鱼香/g, '')
  );
  const isMeaty =
    isSeafood ||
    /肉|鸡|鸭|鹅|牛|羊|猪|排|蹄|肘|腊|肝|腰|肚|翅|五花|里脊|培根|火腿/.test(text) ||
    input.category === '肉类';
  const isVeggie =
    !isMeaty &&
    (/素|豆腐|豆干|腐竹|青菜|菠菜|白菜|萝卜|茄子|豆角|莲藕|藕|笋|菇|菌|冬瓜|南瓜|丝瓜|苦瓜|土豆|西兰花|番茄|青椒|木耳|银耳|海带/.test(
      text
    ) ||
      input.category === '蔬菜');

  if (isSeafood) tags.push('海鲜');
  if (isMeaty) tags.push('荤菜');
  else if (isVeggie) tags.push('素菜');

  if (typeof input.cookTime === 'number' && input.cookTime > 0 && input.cookTime <= 20) {
    tags.push('快手菜');
  }
  if (/减脂|低卡|轻食|沙拉|鸡胸|水煮|低脂/.test(text)) tags.push('减脂餐');
  if (input.category === '川菜' || input.category === '湘菜' || /下饭|香辣|麻辣|剁椒|豆瓣|泡椒|干锅/.test(text)) {
    tags.push('下饭菜');
  }
  if (/夜宵|深夜|烧烤|烤串|串串|小龙虾/.test(text)) tags.push('夜宵');
  if (/宴客|硬菜|大菜|聚会|宴席/.test(text)) tags.push('宴客菜');

  return Array.from(new Set(tags)).slice(0, MAX_RECIPE_TAGS);
}

/**
 * 菜谱分类体系迁移（幂等，可反复调用）：
 * 1. 旧分类（海鲜/肉类/蔬菜/调料/汤…）→ 新主分类
 * 2. 自动推断并补齐特性标签
 * 已符合新体系的菜谱原样返回
 */
export function migrateRecipeTaxonomy<T extends { category: string; tags?: string[]; name?: string }>(
  raw: T
): T & { category: string; tags: string[] } {
  const alreadyModern =
    RECIPE_CATEGORIES.includes(raw.category as RecipeCategory) && Array.isArray(raw.tags);
  if (alreadyModern) {
    return { ...raw, category: raw.category, tags: raw.tags as string[] };
  }

  const mapped = LEGACY_CATEGORY_MAP[raw.category] || {
    category: normalizeCategoryInput(raw.category),
    tags: [] as string[],
  };

  const inferred = inferRecipeTags({
    name: raw.name,
    cookTime: (raw as any).cookTime,
    ingredients: (raw as any).ingredients,
    category: mapped.category,
  });

  const tags = Array.from(new Set([...(mapped.tags || []), ...inferred])).slice(0, MAX_RECIPE_TAGS);
  return { ...raw, category: mapped.category, tags };
}
