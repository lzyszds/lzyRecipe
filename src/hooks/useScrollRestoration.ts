import { useLayoutEffect } from 'react';

interface SavedPosition {
  /** 离开该页时的滚动位置 */
  y: number;
  /** 离开时列表首张卡片相对视口的顶部位置，用于在新布局里校正 */
  anchorOffset: number | null;
}

/** 每个页面列表的滚动位置，只保留在内存里，重启应用后自然失效 */
const positions = new Map<string, SavedPosition>();

/** 卡片上方的间距（吸顶栏底部留白） */
const ANCHOR_PADDING = 16;
/** 恢复后多次校正，覆盖图片/数据异步撑开布局的时刻 */
const CORRECTION_DELAYS = [120, 350, 700, 1200];

/** 列表第一张卡片：数据异步到位、行高变化时靠锚点把位置校准 */
function findFirstItem(): Element | null {
  return (
    document.querySelector('main a[href^="/recipe/"]') ??
    document.querySelector('main [data-list-first]')
  );
}

function takeSnapshot(): SavedPosition {
  const first = findFirstItem();
  return {
    y: window.scrollY,
    anchorOffset: first ? first.getBoundingClientRect().top - ANCHOR_PADDING : null,
  };
}

/**
 * 列表页滚动位置记忆：点进菜谱详情再点“返回”（或切页后再回来），回到原来滚动到的位置。
 * key 应包含筛选条件（如 /recipes?category=川菜），不同分类分别记忆。
 *
 * 做法：
 * - 滚动时实时记录滚动量，同时记住首张卡片在视口中的位置（锚点）
 * - 点击卡片即将离开时再抓一次快照（此时原页面还在，最准确）
 * - 回到该页时先恢复滚动量，再按锚点校正，保证列表重新渲染后仍停在同一道菜上
 *
 * 注意必须在 layout effect 里绑定监听：页面切换时新页面的首帧只会执行 layout effect，
 * 普通 useEffect 可能晚于用户下一次交互，导致离开前的快照丢失。
 */
export function useScrollRestoration(key: string | null) {
  useLayoutEffect(() => {
    if (!key) return;

    const save = () => {
      positions.set(key, takeSnapshot());
    };

    const onScroll = () => {
      // 回到顶部（如列表被替换时浏览器把滚动重置为 0）不覆盖已记录的位置
      if (window.scrollY === 0) return;
      save();
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('a[href^="/recipe/"]')) save();
    };

    // 页面切换瞬间 scrollY 可能已被重置为 0，不能用它覆盖离开前记录的位置
    if (window.scrollY > 0) save();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('pointerdown', onPointerDown, { capture: true });
    };
  }, [key]);

  // 进入页面（含从详情返回、切换分类）时按记录位置恢复
  useLayoutEffect(() => {
    if (!key) return;
    const snapshot = positions.get(key);
    if (!snapshot || snapshot.y <= 0) return;

    let cancelled = false;
    const restore = () => {
      if (cancelled) return;
      // 用当前首张卡片的位置反推：让“离开时它所在的位置”重新出现需要滚到哪
      let target = snapshot.y;
      const first = findFirstItem();
      if (first && snapshot.anchorOffset !== null) {
        const anchorTarget =
          window.scrollY + first.getBoundingClientRect().top - ANCHOR_PADDING - snapshot.anchorOffset;
        // 差异过大说明列表内容完全变了，锚点不可信，退回按滚动量恢复
        if (Math.abs(anchorTarget - snapshot.y) < 600) target = anchorTarget;
      }
      window.scrollTo({ top: Math.max(0, target), left: 0, behavior: 'instant' });
    };

    restore();
    const timers = CORRECTION_DELAYS.map((delay) => window.setTimeout(restore, delay));
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [key]);
}
