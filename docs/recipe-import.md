# 菜谱导入数据结构说明

导入菜谱请严格按本文结构产出 JSON。本文档依据 `mobile/src/types/index.ts` 编写。

## 1. 类型定义（TypeScript）

```ts
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
  coverImage: string;
  description: string;
  ingredients: Ingredient[];
  steps: Step[];
  tips: string;
  cookTime: number;            // 分钟
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;           // ISO 日期字符串，如 '2024-01-23'
  updatedAt?: string;          // ISO 日期字符串，云端同步冲突判定用
  aiGenerated?: boolean;       // 列表会显示 AI 生成标记
}
```

## 2. JSON 模板

单条菜谱直接是上面的对象；批量导入时用一个数组包起来。完整示例见 `docs/recipe-template.json`。

```json
[
  {
    "id": "u200",
    "name": "宫保鸡丁",
    "category": "川菜",
    "coverImage": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80",
    "description": "经典川味，鸡肉滑嫩、花生酥脆，荔枝口酸甜微辣。",
    "ingredients": [
      { "name": "鸡胸肉", "amount": "300g" },
      { "name": "花生米", "amount": "50g" }
    ],
    "steps": [
      { "order": 1, "description": "鸡胸肉切丁，加生抽、料酒、淀粉腌10分钟。" },
      { "order": 2, "description": "热油下花生米炸至微黄捞出。" }
    ],
    "tips": "花生米要凉油下锅小火慢炸，才不会发苦。",
    "cookTime": 25,
    "difficulty": "easy",
    "createdAt": "2024-01-23",
    "updatedAt": "2024-01-23",
    "aiGenerated": false
  }
]
```

## 3. 字段规则

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `id` | 是 | string | 全局唯一，不要与内置菜谱 id 冲突（内置前缀：`s` `b` `c` `d` `h` `m` `v` `st` `dt` `x` `soup` `u`）。外部导入建议用 `u` + 自增数字或 `imp_` + 短哈希 |
| `name` | 是 | string | 菜名，不要带序号前缀 |
| `category` | 是 | string | 必须取自下方白名单，否则分类导航里不显示 |
| `coverImage` | 是 | string | 见下方「封面规则」；留空字符串会显示占位图 |
| `description` | 是 | string | 一句话简介，25 字左右最佳 |
| `ingredients` | 是 | Ingredient[] | 主料在前、调料在后，`amount` 写清单位（`300g`、`2勺`、`适量`） |
| `steps` | 是 | Step[] | `order` 从 1 开始连续递增 |
| `tips` | 是 | string | 关键诀窍，30 字左右；没有就写空字符串 `""` |
| `cookTime` | 是 | number | 单位分钟，纯数字，不要写 `"25分钟"` |
| `difficulty` | 是 | enum | 只能是 `easy` / `medium` / `hard` |
| `createdAt` | 是 | string | ISO 字符串 `YYYY-MM-DD` 或完整 ISO 时间 |
| `updatedAt` | 否 | string | 缺省时导入代码会自动填当前时间 |
| `aiGenerated` | 否 | boolean | 外部导入的菜谱一般填 `false` |
| `steps[].image` | 否 | string | 步骤配图 URL，目前详情页未强制渲染 |

## 4. 分类白名单

`category` 只能取以下值（与 `mobile/src/data/recipes.ts` 的 `categories` 一致）：

`川菜` `粤菜` `湘菜` `鲁菜` `西餐` `甜点` `饮品` `家常菜` `海鲜` `早餐` `汤` `肉类` `蔬菜` `主食` `调料`

> 编辑弹窗额外允许 `快手菜` `减脂餐` `汤羹`，但这三个不在分类导航白名单里，导入时用了只在「全部」列表出现、导航栏不出现，建议优先用上面的 15 个。

## 5. 封面规则（`coverImage`）

1. **http(s) 完整 URL** —— 直接可用，App 内用 `expo-image` 加载。
2. **`data:image/...;base64,...`** —— 可用，但会撑大本地存储与云端同步体积，建议少用。
3. **`/covers/xxx.jpg` 相对路径** —— 会被拼到同步服务器域名下（默认 `https://sync.lzyszds.cn`），前提是服务器 `/data/covers/` 下确实有同名文件。
4. **留空 `""`** —— 显示莫兰迪色占位图 + 菜名，功能不受影响。

## 6. 三种导入方式

### A. 写进内置数据（随包发布，所有用户可见）

把 JSON 数组追加到 `mobile/src/data/recipes.ts` 的 `recipes` 数组里：

```ts
export const recipes: Recipe[] = [
  // ...原有 131 条
  { id: 'u200', name: '宫保鸡丁', /* ... */ },
];
```

### B. 运行时导入（存在用户本地 + 自动云同步，推荐）

```ts
import { useImportedRecipesStore } from '@/store/importedRecipesStore';

const raw = await fetch('https://your-cdn/recipes.json').then((r) => r.json());
useImportedRecipesStore.getState().addImportedRecipes(raw);
```

`addImportedRecipes` 会自动补 `createdAt`/`updatedAt`、按 id 去重，并触发云端同步。

### C. 通过云同步接口下发

云同步 payload 里的 `importedRecipes` 字段就是这个数组（见 `mobile/src/lib/cloudSync.ts`）：

```json
{
  "favorites": [],
  "importedRecipes": [ /* Recipe[] */ ],
  "weeklyPlan": { "weekKey": "2026-10-19", "plans": [] },
  "notes": []
}
```

## 7. 最小校验（导入前跑一遍）

```ts
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const CATEGORIES = new Set(['川菜','粤菜','湘菜','鲁菜','西餐','甜点','饮品','家常菜','海鲜','早餐','汤','肉类','蔬菜','主食','调料']);

function isValidRecipe(r: any): boolean {
  return (
    typeof r?.id === 'string' && r.id.length > 0 &&
    typeof r?.name === 'string' && r.name.length > 0 &&
    CATEGORIES.has(r?.category) &&
    DIFFICULTIES.has(r?.difficulty) &&
    typeof r?.cookTime === 'number' && r.cookTime > 0 &&
    Array.isArray(r?.ingredients) && r.ingredients.every((i: any) => i?.name && i?.amount !== undefined) &&
    Array.isArray(r?.steps) && r.steps.length > 0 &&
    r.steps.every((s: any, idx: number) => s?.order === idx + 1 && typeof s?.description === 'string')
  );
}
```
