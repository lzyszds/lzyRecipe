/**
 * 应用内统一的菜谱分类选项（编辑器、AI 生成、试菜对比共用）
 */
export const RECIPE_CATEGORIES = [
  '家常菜',
  '快手菜',
  '川菜',
  '粤菜',
  '湘菜',
  '鲁菜',
  '汤羹',
  '主食',
  '海鲜',
  '肉类',
  '蔬菜',
  '减脂餐',
  '甜点',
  '饮品',
];

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];
