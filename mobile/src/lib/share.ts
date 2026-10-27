import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { toast } from '@/store/feedbackStore';
import { Recipe } from '@/types';

/** 系统分享面板是否可用（Web 端降级为复制到剪贴板） */
export function isSystemShareSupported(): boolean {
  return Platform.OS !== 'web';
}

/**
 * 调起系统分享面板发送纯文本（微信、QQ 等任选）。
 * Web 端优先使用浏览器原生 Web Share API，不可用时降级为复制。
 */
export async function shareText(message: string, title?: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: message });
        return;
      } catch {
        // 用户取消或浏览器拒绝，继续走复制兜底
      }
    }
    await Clipboard.setStringAsync(message);
    toast({ type: 'success', message: '已复制到剪贴板，可粘贴发送给家人朋友' });
    return;
  }

  try {
    await Share.share({ message, title });
  } catch {
    // 用户取消分享无需提示
  }
}

/** 菜谱分享文本 */
export function buildRecipeShareText(recipe: Recipe): string {
  const lines: string[] = [`【私房菜谱】${recipe.name}`];

  if (recipe.description?.trim()) {
    lines.push(`\n${recipe.description.trim()}`);
  }

  lines.push(
    `\n耗时 ${recipe.cookTime || 20} 分钟 · 难度 ${
      { easy: '简单', medium: '中等', hard: '困难' }[recipe.difficulty] || '普通'
    }`
  );

  if (recipe.ingredients?.length) {
    lines.push('\n【用料】');
    recipe.ingredients.forEach((ing) => {
      lines.push(`• ${ing.name}${ing.amount ? ` ${ing.amount}` : ''}`);
    });
  }

  if (recipe.steps?.length) {
    lines.push('\n【做法】');
    recipe.steps.forEach((step, idx) => {
      lines.push(`${step.order || idx + 1}. ${step.description}`);
    });
  }

  if (recipe.tips?.trim()) {
    lines.push(`\n【小贴士】${recipe.tips.trim()}`);
  }

  lines.push('\n来自 食刻 CookMoment · 掌上私人美食生活');
  return lines.join('\n');
}

export interface WeeklyPlanDayShare {
  /** 星期，如「周一」 */
  weekday: string;
  /** 日期，如「10/27」 */
  dateLabel: string;
  breakfast: string;
  lunch: string;
  dinner: string;
}

/** 一周便当计划分享文本 */
export function buildWeeklyPlanShareText(
  weekRange: string,
  days: WeeklyPlanDayShare[]
): string {
  const lines: string[] = [`【一周便当计划】(${weekRange})`];

  days.forEach((day) => {
    lines.push(
      `${day.weekday} ${day.dateLabel}：早 ${day.breakfast} / 午 ${day.lunch} / 晚 ${day.dinner}`
    );
  });

  lines.push('\n来自 食刻·便当盒，拒绝外卖从好好吃饭开始');
  return lines.join('\n');
}
