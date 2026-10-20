import type { Recipe } from '../types';
import type { WeeklyPlanDay } from '../store/weeklyPlanStore';
import {
  MEAL_SLOTS,
  formatWeekRange,
  getDayDateLabel,
  getMealSlotLabel,
  hasPlannedMeals,
} from './weeklyPlan';
import { isTauri } from './tauri';
import { dataUrlToBlob, dataUrlToDownload, downloadBlob } from './imageBlob';

import { APP_NAME, APP_TAGLINE } from './appBrand';

const COLORS = {
  bg: '#F6F7F9',
  accent: '#F2F7F4',
  primary: '#2D6A4F',
  outline: '#E8EAED',
  text: '#171A1D',
  textMuted: '#9AA1A9',
  white: '#FFFFFF',
  breakfast: '#F2EBD9',
  lunch: '#E1EDE6',
  dinner: '#DCE9E2',
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: COLORS.breakfast,
  lunch: COLORS.lunch,
  dinner: COLORS.dinner,
};

const WIDTH = 750;
const PAD = 36;
const CARD_RADIUS = 20;

export interface WeeklyPlanImageData {
  weekKey: string;
  plans: WeeklyPlanDay[];
  recipes: Recipe[];
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawDotPattern(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, w, h);

  for (let y = 0; y < h; y += 28) {
    for (let x = 0; x < w; x += 28) {
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(45, 106, 79, 0.08)';
      ctx.fill();
    }
  }
}

function drawSoftShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.save();
  ctx.shadowColor = 'rgba(17, 24, 39, 0.06)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.restore();
}

function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  drawSoftShadow(ctx, x, y, w, h, CARD_RADIUS);
  roundRect(ctx, x, y, w, h, CARD_RADIUS);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
}

async function loadLogoImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Logo 加载失败'));
    img.src = '/logo.png';
  });
}

function drawLogoFallback(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  roundRect(ctx, x, y, size, size, 14);
  ctx.fillStyle = COLORS.accent;
  ctx.fill();
  ctx.font = `${size * 0.45}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍳', x + size / 2, y + size / 2);
}

function drawRoundedLogo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
) {
  const radius = 14;
  ctx.save();
  roundRect(ctx, x, y, size, size, radius);
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load('700 24px "ZCOOL KuaiLe"'),
      document.fonts.load('700 16px "Noto Sans SC"'),
      document.fonts.load('500 14px "Noto Sans SC"'),
    ]);
  } catch {
    /* 系统字体降级 */
  }
}

function estimateHeight(plans: WeeklyPlanDay[]): number {
  let h = PAD + 120 + 24;
  for (const day of plans) {
    const mealCount = MEAL_SLOTS.filter((s) => day[s.key].recipeId).length;
    if (mealCount === 0) continue;
    h += 56 + mealCount * 38 + 16;
  }
  return Math.max(h + 80, 400);
}

export function buildWeeklyPlanShareText(data: WeeklyPlanImageData): string {
  const { weekKey, plans, recipes } = data;
  const lines: string[] = [`🍳 本周烹饪计划`, formatWeekRange(weekKey), ''];

  for (const day of plans) {
    const hasAny = MEAL_SLOTS.some((s) => day[s.key].recipeId);
    if (!hasAny) continue;

    lines.push(getDayDateLabel(weekKey, day.dayIndex));
    for (const slot of MEAL_SLOTS) {
      const entry = day[slot.key];
      if (!entry.recipeId) continue;
      const recipe = recipes.find((r) => r.id === entry.recipeId);
      lines.push(`  ${getMealSlotLabel(slot.key)}：${recipe?.name ?? '未知菜谱'}`);
    }
    lines.push('');
  }

  lines.push(`—— ${APP_NAME}`);
  return lines.join('\n').trim();
}

export async function generateWeeklyPlanImage(data: WeeklyPlanImageData): Promise<string> {
  if (!hasPlannedMeals(data.plans)) {
    throw new Error('请先安排至少一餐，再分享或保存');
  }

  await ensureFonts();

  const { weekKey, plans, recipes } = data;
  const height = estimateHeight(plans);
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建画布');

  drawDotPattern(ctx, WIDTH, height);

  let y = PAD;

  drawCard(ctx, PAD, y, WIDTH - PAD * 2, 96);
  try {
    const logo = await loadLogoImage();
    drawRoundedLogo(ctx, logo, PAD + 16, y + 16, 64);
  } catch {
    drawLogoFallback(ctx, PAD + 16, y + 16, 64);
  }

  ctx.textAlign = 'left';
  ctx.font = '700 26px "Noto Sans SC", sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('本周饮食计划', PAD + 96, y + 38);

  ctx.font = '600 16px "Noto Sans SC", sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText(formatWeekRange(weekKey), PAD + 96, y + 68);

  y += 96 + 20;

  for (const day of plans) {
    const meals = MEAL_SLOTS.map((slot) => ({
      slot,
      recipe: recipes.find((r) => r.id === day[slot.key].recipeId),
    })).filter((m) => m.recipe);

    if (meals.length === 0) continue;

    const cardH = 48 + meals.length * 38 + 12;
    drawCard(ctx, PAD, y, WIDTH - PAD * 2, cardH);

    ctx.font = '700 16px "Noto Sans SC", sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(getDayDateLabel(weekKey, day.dayIndex), PAD + 20, y + 16);

    let rowY = y + 48;
    for (const { slot, recipe } of meals) {
      if (!recipe) continue;
      const mealColor = MEAL_COLORS[slot.key] ?? COLORS.accent;

      roundRect(ctx, PAD + 20, rowY + 4, 32, 28, 10);
      ctx.fillStyle = mealColor;
      ctx.fill();

      ctx.font = '600 13px "Noto Sans SC", sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slot.short, PAD + 36, rowY + 18);

      ctx.textAlign = 'left';
      ctx.font = '600 15px "Noto Sans SC", sans-serif';
      ctx.fillText(
        truncateText(ctx, recipe.name, WIDTH - PAD * 2 - 100),
        PAD + 64,
        rowY + 18
      );

      ctx.font = '500 12px "Noto Sans SC", sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.textAlign = 'right';
      ctx.fillText(recipe.category, WIDTH - PAD - 24, rowY + 18);

      rowY += 38;
    }

    y += cardH + 14;
  }

  ctx.font = '600 14px "Noto Sans SC", sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${APP_NAME} · ${APP_TAGLINE}`, WIDTH / 2, height - 36);

  return canvas.toDataURL('image/png');
}

export async function generateWeeklyPlanImageBlob(data: WeeklyPlanImageData): Promise<Blob> {
  const dataUrl = await generateWeeklyPlanImage(data);
  return dataUrlToBlob(dataUrl);
}

export function downloadWeeklyPlanImage(dataUrl: string, weekKey: string) {
  dataUrlToDownload(dataUrl, `周菜单-${weekKey}.png`);
}

export async function saveWeeklyPlanImageTauri(blob: Blob, weekKey: string) {
  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeFile } = await import('@tauri-apps/plugin-fs');

  const path = await save({
    defaultPath: `周菜单-${weekKey}.png`,
    filters: [{ name: 'PNG 图片', extensions: ['png'] }],
  });

  if (!path || typeof path !== 'string') return false;

  const buffer = await blob.arrayBuffer();
  await writeFile(path, new Uint8Array(buffer));
  return true;
}

export async function saveWeeklyPlanImage(data: WeeklyPlanImageData): Promise<void> {
  const blob = await generateWeeklyPlanImageBlob(data);
  const filename = `周菜单-${data.weekKey}.png`;

  if (isTauri()) {
    const ok = await saveWeeklyPlanImageTauri(blob, data.weekKey);
    if (ok) return;
  }

  downloadBlob(blob, filename);
}

export async function shareWeeklyPlan(
  data: WeeklyPlanImageData
): Promise<'shared' | 'saved' | 'copied'> {
  const text = buildWeeklyPlanShareText(data);
  const blob = await generateWeeklyPlanImageBlob(data);
  const filename = `周菜单-${data.weekKey}.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.share) {
    try {
      const payload: ShareData = { title: '本周烹饪计划', text };
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ ...payload, files: [file] });
        return 'shared';
      }
      await navigator.share(payload);
      downloadBlob(blob, filename);
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch {
    /*  clipboard 不可用时仍下载图片 */
  }

  downloadBlob(blob, filename);
  return navigator.clipboard ? 'copied' : 'saved';
}
