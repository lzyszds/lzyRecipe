export interface Ingredient {
  name: string;
  amount: string;
}

export interface Step {
  order: number;
  description: string;
  image?: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  /** 特性标签（多选）：荤菜/素菜/海鲜/快手菜/减脂餐/下饭菜/宴客菜/夜宵 */
  tags?: string[];
  coverImage: string;
  description: string;
  ingredients: Ingredient[];
  steps: Step[];
  tips: string;
  cookTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
  /** 最后修改时间戳（ISO 字符串），用于云端双向同步时保护最新修改 */
  updatedAt?: string;
  /** 由 AI 生成（写菜谱页一键生成时写入，列表里会加个小标记） */
  aiGenerated?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
