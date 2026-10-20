import { useRef } from 'react';
import { useLocation } from 'react-router-dom';

const TAB_ORDER = ['/', '/profile'];

function computeDirection(from: string, to: string): number {
  const fromTab = TAB_ORDER.indexOf(from);
  const toTab = TAB_ORDER.indexOf(to);

  if (fromTab >= 0 && toTab >= 0) {
    return toTab > fromTab ? 1 : -1;
  }

  const fromDepth = from.split('/').filter(Boolean).length;
  const toDepth = to.split('/').filter(Boolean).length;
  if (toDepth > fromDepth) return 1;
  if (toDepth < fromDepth) return -1;
  return 1;
}

/** 1 = 前进（新页从右入），-1 = 返回（新页从左入） */
export function useRouteDirection(): number {
  const location = useLocation();
  const prevPath = useRef(location.pathname);
  const direction = useRef(1);

  if (prevPath.current !== location.pathname) {
    direction.current = computeDirection(prevPath.current, location.pathname);
    prevPath.current = location.pathname;
  }

  return direction.current;
}
