interface AndroidStatusBarBridge {
  setStatusBar: (color: string, darkIcons: boolean) => void;
}

declare global {
  interface Window {
    AndroidStatusBar?: AndroidStatusBarBridge;
  }
}

const OPAQUE = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*1\s*)?\)/;

function rgbToHex(rgb: string): string | null {
  const values = rgb.match(/\d+(\.\d+)?/g);
  if (!values || values.length < 3) return null;
  return (
    '#' +
    values
      .slice(0, 3)
      .map((v) => Math.round(Number(v)).toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * 状态栏正下方实际看到的底色。
 * 优先找页面顶部的不透明吸顶栏（.page-header / sticky 顶栏），
 * 避免依赖全局 html 底色而忽略页面自身的顶部背景（如旧版详情页）。
 */
function getStatusBarColor(): string {
  const isStuckAtTop = (el: Element) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return (
      /(sticky|fixed)/.test(style.position) &&
      rect.top <= 1 &&
      rect.bottom > 0 &&
      rect.height < window.innerHeight * 0.5
    );
  };

  const headers = Array.from(
    document.querySelectorAll<HTMLElement>('.page-header, header[class*="top-"], [class*="sticky"][class*="top-"]')
  );
  for (const header of headers) {
    if (!isStuckAtTop(header)) continue;
    const bg = getComputedStyle(header).backgroundColor;
    if (OPAQUE.test(bg)) return bg;
  }

  const html = getComputedStyle(document.documentElement).backgroundColor;
  if (OPAQUE.test(html)) return html;
  return getComputedStyle(document.body).backgroundColor;
}

// 让系统状态栏背景与页面顶部一致，并根据背景亮度自动切换时间/电量等图标颜色。
// 原生层启动时已设置一次页面底色，但页面切换后（如详情页大图、全屏色块）需要重新同步，
// 否则状态栏会停留在上一页颜色，看起来像“顶部颜色不一致”。
export function syncNativeStatusBar() {
  const bridge = window.AndroidStatusBar;
  if (!bridge) return;

  const hex = rgbToHex(getStatusBarColor());
  if (!hex) return;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  bridge.setStatusBar(hex, luminance >= 160);
}
