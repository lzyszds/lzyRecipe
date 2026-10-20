import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** 路由切换时滚到页面顶部，避免沿用上一页的 scroll 位置 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 仅真正的页面切换时回到顶部；同页切换查询参数（如分类筛选）保持滚动
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // 内部滚动容器由各自页面通过 sessionStorage 维护位置，这里交给页面自行恢复
  }, [pathname]);

  return null;
}
