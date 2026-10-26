import type { Ingredient, Step } from '@/types';

/**
 * 食材-步骤一致性校验（纯逻辑，不依赖任何运行时模块）
 *
 * 目标：保证“食材清单里有的，步骤里真的用到了”。
 * 这是 AI 生成菜谱最常见的翻车点——比如食材里有柱侯酱，
 * 步骤却完全没提，用户按教程做完发现酱根本没下锅。
 */

/** 把食材名 / 步骤文本归一化：去括号注释、空白与标点，转小写 */
function normalizeForMatch(input: string): string {
  return String(input || '')
    .replace(/（.*?）|\(.*?\)/g, '')
    .replace(/[\s\u200b\u3000、,，。.：:；;（）()【】\[\]·]/g, '')
    .toLowerCase();
}

/** 常见叫法互相映射，避免“柱侯酱/柱候酱”“生粉/淀粉”这类误报 */
const INGREDIENT_ALIAS: Record<string, string[]> = {
  柱侯酱: ['柱侯酱', '柱候酱'],
  柱候酱: ['柱侯酱', '柱候酱'],
  生粉: ['生粉', '淀粉'],
  淀粉: ['生粉', '淀粉'],
  玉米淀粉: ['淀粉', '生粉'],
  土豆淀粉: ['淀粉', '生粉'],
  红薯淀粉: ['淀粉', '生粉'],
  生抽: ['生抽', '酱油'],
  酱油: ['生抽', '酱油'],
  豉油: ['生抽', '酱油', '豉油'],
  大蒜: ['蒜'],
  独头蒜: ['蒜'],
  蒜头: ['蒜'],
  蒜瓣: ['蒜'],
  香葱: ['葱'],
  小葱: ['葱'],
  大葱: ['葱'],
  葱花: ['葱'],
  生姜: ['姜'],
  老姜: ['姜'],
  姜: ['姜'],
  食用油: ['油'],
  白糖: ['糖'],
  砂糖: ['糖'],
  冰糖: ['冰糖', '糖'],
  青蟹: ['蟹'],
  肉蟹: ['蟹'],
  大闸蟹: ['蟹'],
  梭子蟹: ['蟹'],
  鲜基围虾: ['虾'],
  鲜虾: ['虾'],
  大虾: ['虾'],
  虾仁: ['虾'],
  鸡胸肉: ['鸡胸', '鸡脯'],
  鸡蛋: ['蛋'],
  鸡蛋清: ['蛋清', '蛋白'],
  盐: ['盐'],
  食用盐: ['盐'],
};

/** 去掉食材名前后常见修饰/形态后缀，得到用于兜底匹配的“核心词” */
function getCoreName(name: string): string {
  return normalizeForMatch(name)
    .replace(/^(新鲜|鲜|干|老|嫩|小|大|厚|薄|泡发好的?)/, '')
    .replace(/(块|片|段|末|丝|粒|丁|圈|条|把|头|瓣|根|个|只|斤|克|g|适量|少许)$/, '');
}

/** 检查每个食材是否真的在步骤里被用到，返回未使用的食材名列表 */
export function findUnusedIngredients(
  ingredients: Ingredient[],
  steps: Step[]
): string[] {
  const stepText = normalizeForMatch(
    (steps || []).map((s) => s.description).join('|')
  );
  if (!stepText) return (ingredients || []).map((i) => i.name);

  return (ingredients || [])
    .map((i) => i.name)
    .filter((rawName) => {
      const normalized = normalizeForMatch(rawName);
      if (!normalized) return false;

      const aliases = INGREDIENT_ALIAS[normalized] || [normalized];
      if (aliases.some((alias) => stepText.includes(normalizeForMatch(alias)))) {
        return false;
      }

      const core = getCoreName(rawName);
      return !(core.length >= 2 && stepText.includes(core));
    });
}
