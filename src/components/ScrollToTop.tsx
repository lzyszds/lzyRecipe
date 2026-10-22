import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** 自己管理滚动位置的列表页：由 useScrollRestoration 负责回顶/恢复，这里不再插手 */
const SELF_MANAGED_PATHS = ['/recipes', '/search', '/category', '/favorites', '/imported'];

function isSelfManaged(pathname: string) {
  return SELF_MANAGED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * 非列表页切换时把滚动位置归零，避免新页面沿用上一页的 scroll 位置。
 * 列表页自己会处理（首次进入回顶、返回时恢复原位置），这里必须跳过：
 * 否则页面切换瞬间的“归零”会触发滚动事件，把列表页刚记录的离开位置覆盖成 0。
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    if (isSelfManaged(pathname)) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
