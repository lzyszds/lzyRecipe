interface AndroidStatusBarBridge {
  setStatusBar: (color: string, darkIcons: boolean) => void;
}

declare global {
  interface Window {
    AndroidStatusBar?: AndroidStatusBarBridge;
  }
}

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

// 让系统状态栏背景与页面背景一致，并根据背景亮度自动切换时间/电量等图标颜色
export function syncNativeStatusBar() {
  const bridge = window.AndroidStatusBar;
  if (!bridge) return;

  const background = getComputedStyle(document.body).backgroundColor;
  const hex = rgbToHex(background);
  if (!hex) return;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  bridge.setStatusBar(hex, luminance >= 160);
}
