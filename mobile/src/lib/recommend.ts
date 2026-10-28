/**
 * 小红书式无限信息流推荐引擎
 *
 * 完全在设备端计算（项目菜谱库本地打包、暂无后端账号体系）：
 * - 口味画像：收藏 / 最近做过 / 浏览记录（feedProfileStore）聚合成分类与标签偏好
 * - 会话级加权随机抽样：每次冷启动换 seed，推荐顺序各不相同，画像方向保持稳定
 * - 内容先验：步骤/用料/封面完整度做基础权重，避免低质内容挤占前排
 * - 多样性约束：连续同类目菜肴打散重摇，避免"一屏全是红烧肉"
 * - 探索机制：随机扰动保证冷门菜也有机会露出，持续把没吃过的菜往上推
 *
 * 接口为纯函数、逐页拉取式，将来若引入后端账号/协同过滤，
 * 可将本文件原样迁移到服务端计算，前端只替换 createFeedSession 为接口请求。
 */
import type { Recipe } from '@/types';

/** 口味信号输入（由调用方从各 store 快照） */
export interface TasteSignals {
  /** 收藏的菜谱 id */
  favorites: string[];
  /** 最近做过的菜谱 id（降权：推新口味） */
  cookedIds: string[];
  /** 分类浏览次数画像 */
  categoryViews: Record<string, number>;
  /** 标签浏览次数画像 */
  tagViews: Record<string, number>;
}

export interface FeedSession {
  /** 拉取下一页推荐（返回空数组表示没有更多） */
  next: (pageSize: number) => Recipe[];
  /** 池剩余量 */
  remaining: () => number;
}

/** 稳定伪随机 0~1：同一 (seed, id) 恒定，跨会话/跨菜变化 */
function stableHash(seed: number, id: string): number {
  let h = seed >>> 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

/** 内容质量先验 0.5~1.0：完整度高的菜谱有更高基础露出概率 */
function qualityPrior(recipe: Recipe): number {
  let q = 0.5;
  q += Math.min((recipe.steps?.length || 0) / 6, 2) * 0.12; // 步骤完整度 0~0.24
  q += (recipe.ingredients?.length || 0) >= 4 ? 0.12 : 0; // 用料丰富
  q += recipe.coverImage ? 0.15 : 0; // 有封面
  q += recipe.tips ? 0.1 : 0; // 有诀窍
  return Math.min(q, 1);
}

/**
 * 创建一个推荐会话：
 * 内部维护候选池与剩余权重，逐页加权无放回抽样。
 * @param seed 会话种子（每次冷启动换新 → 推荐内容每次进入都不同）
 * @param sceneFilter 可选场景过滤（快手/川湘等人群筛选）
 */
export function createFeedSession(
  allRecipes: Recipe[],
  signals: TasteSignals,
  sceneFilter?: (r: Recipe) => boolean,
  seed: number = Math.floor(Math.random() * 1e9)
): FeedSession {
  const favSet = new Set(signals.favorites);
  const cookedSet = new Set(signals.cookedIds);

  // 从收藏聚合成"用户最爱的分类/标签"（比单独浏览更强的正向信号）
  const favCat = new Map<string, number>();
  const favTag = new Map<string, number>();
  for (const r of allRecipes) {
    if (!favSet.has(r.id)) continue;
    if (r.category) favCat.set(r.category, (favCat.get(r.category) || 0) + 1);
    for (const t of r.tags || []) favTag.set(t, (favTag.get(t) || 0) + 1);
  }

  // 候选池 + 逐条权重（一次性预算，抽样按权重轮盘）
  const pool = allRecipes.filter((r) => !sceneFilter || sceneFilter(r));
  const weights: number[] = pool.map((r) => {
    let w = qualityPrior(r);

    // 浏览画像（弱信号，对数衰减避免刷屏爆炸）
    const cv = signals.categoryViews[r.category || ''] || 0;
    let tv = 0;
    for (const t of r.tags || []) tv += signals.tagViews[t] || 0;
    w += Math.log1p(cv) * 0.35;
    w += Math.log1p(tv) * 0.1;

    // 收藏画像（强信号）
    const fc = favCat.get(r.category || '');
    if (fc) w += Math.min(1.2, fc * 0.25);
    let ft = 0;
    for (const t of r.tags || []) ft += favTag.get(t) || 0;
    w += Math.min(0.9, ft * 0.2);

    // 最近吃过的单条菜品强降权：把位置让给没做过的新菜
    if (cookedSet.has(r.id)) w *= 0.15;

    // 会话级随机扰动 ×0.55~1.85：每次进入打乱次序，保持探索与新鲜感
    w *= 0.55 + stableHash(seed, r.id) * 1.3;

    return Math.max(0.05, w);
  });

  // 多样性：连续同类目时 60% 概率重摇一次，打散刷屏
  let lastCategory: string | null = null;

  const pickOne = (): Recipe | null => {
    for (let attempt = 0; attempt < 3; attempt++) {
      let total = 0;
      for (let i = 0; i < pool.length; i++) total += weights[i];
      if (total <= 0) return null;
      let roll = Math.random() * total;
      for (let i = 0; i < pool.length; i++) {
        roll -= weights[i];
        if (roll > 0) continue;
        const pick = pool[i];
        const cat = pick.category || '';
        if (attempt < 2 && cat && cat === lastCategory) break; // 重摇
        // 无放回：权重清零并移出池
        weights.splice(i, 1);
        pool.splice(i, 1);
        lastCategory = cat;
        return pick;
      }
    }
    // 兜底：取池首
    const fallback = pool.shift();
    return fallback ?? null;
  };

  return {
    next(pageSize: number): Recipe[] {
      const page: Recipe[] = [];
      for (let i = 0; i < pageSize; i++) {
        const pick = pickOne();
        if (!pick) break;
        page.push(pick);
      }
      return page;
    },
    remaining: () => pool.length,
  };
}
