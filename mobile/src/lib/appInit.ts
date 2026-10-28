import { Image } from 'expo-image';
import { useBentoStore } from '@/store/bentoStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useImportedRecipesStore } from '@/store/importedRecipesStore';
import { useNotesStore } from '@/store/notesStore';
import { useRecentCookedStore } from '@/store/recentCookedStore';
import { useSettingsStore, isSyncConfigured } from '@/store/settingsStore';
import { getAllRecipes } from './recipes';
import { pickHeroSlides } from './heroPicks';
import { syncNow } from './cloudSync';
import { resolveCoverUrl } from '../components/RecipeImage';

/**
 * 开屏动画窗口内的真实启动工作：
 * 1. 本地数据注水  —— 等待 zustand 持久化 store 从 AsyncStorage 恢复完毕，进首页不闪空
 * 2. 多端数据同步  —— 已配置云同步时趁动画窗口完成一次双向同步（带超时保护，超时转后台继续）
 * 3. 今日封面预热  —— 用与首页完全一致的精选算法算出即将展示的菜谱，提前预加载封面
 *
 * 所有步骤失败均不阻塞启动；同步与预加载带超时上限，慢网下开屏也不会无限等待。
 */

export interface AppInitProgress {
  /** 0~1 总进度 */
  progress: number;
  /** 当前步骤展示文案 */
  label: string;
}

interface PersistLike {
  hasHydrated: () => boolean;
  onFinishHydration: (cb: () => void) => () => void;
}

function waitForHydration(store: { persist: PersistLike }, timeoutMs = 1500): Promise<void> {
  if (store.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsub();
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    const unsub = store.persist.onFinishHydration(finish);
  });
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 步骤 1：等待核心 store 全部完成持久化注水 */
async function stepStores(): Promise<void> {
  await Promise.all([
    waitForHydration(useFavoritesStore),
    waitForHydration(useImportedRecipesStore),
    waitForHydration(useBentoStore),
    waitForHydration(useNotesStore),
    waitForHydration(useSettingsStore),
    waitForHydration(useRecentCookedStore),
  ]);
}

/** 步骤 2：趁开屏窗口做一次真实云同步（未配置则瞬时跳过；超时后同步转后台继续） */
async function stepSync(timeoutMs: number): Promise<void> {
  const { sync } = useSettingsStore.getState();
  if (!isSyncConfigured(sync) || !sync.autoSync) return;
  await Promise.race([
    syncNow(sync).catch(() => false),
    sleep(timeoutMs),
  ]);
}

/** 步骤 3：预加载首页即将展示的封面（主厨推荐 + 最近点过） */
async function stepCovers(timeoutMs: number): Promise<void> {
  const imported = useImportedRecipesStore.getState().importedRecipes;
  const allRecipes = getAllRecipes(imported);
  if (allRecipes.length === 0) return;

  const { favorites } = useFavoritesStore.getState();
  const recent = useRecentCookedStore.getState().recent;
  const heroPicks = pickHeroSlides(allRecipes, favorites, recent).slice(0, 5);
  const recentRecipes = recent
    .map((item) => allRecipes.find((r) => r.id === item.recipeId))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .slice(0, 10);

  const urls = new Set<string>();
  for (const recipe of [...heroPicks, ...recentRecipes]) {
    const url = resolveCoverUrl(recipe.coverImage);
    if (url) urls.add(url);
  }
  if (urls.size === 0) return;

  await Promise.race([
    Promise.allSettled(Array.from(urls).slice(0, 12).map((url) => Image.prefetch(url))),
    sleep(timeoutMs),
  ]);
}

const STEPS = [
  { key: 'stores', label: '本地数据准备中…', weight: 0.3, run: () => stepStores() },
  { key: 'sync', label: '多端数据同步中…', weight: 0.35, run: () => stepSync(4000) },
  { key: 'covers', label: '今日封面预热中…', weight: 0.35, run: () => stepCovers(3000) },
] as const;

/** 依次执行启动工作并通过 onProgress 汇报真实进度；任何单步失败都跳过不阻塞 */
export async function runAppInit(onProgress: (p: AppInitProgress) => void): Promise<void> {
  let done = 0;
  for (const step of STEPS) {
    onProgress({ progress: Math.min(done, 0.97), label: step.label });
    try {
      await step.run();
    } catch {
      // 单步失败不阻塞启动
    }
    done += step.weight;
    onProgress({ progress: Math.min(done, 1), label: step.label });
  }
}
