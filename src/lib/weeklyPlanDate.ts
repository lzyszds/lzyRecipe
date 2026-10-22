import { WEEK_DAYS } from './weeklyPlan';

/** 周历里某一天的“日”数字，如 21 */
export function getDayNumber(weekKey: string, dayIndex: number): number {
  const monday = new Date(`${weekKey}T00:00:00`);
  if (Number.isNaN(monday.getTime())) return dayIndex + 1;
  const date = new Date(monday);
  date.setDate(monday.getDate() + dayIndex);
  return date.getDate();
}

/** 日期标签：今天 / 昨天 / 明天 / 后天 / 周一 */
export function getDayTag(dayIndex: number, todayIndex: number): string {
  const diff = dayIndex - todayIndex;
  if (diff === 0) return '今天';
  if (diff === -1) return '昨天';
  if (diff === 1) return '明天';
  if (diff === 2) return '后天';
  return `周${WEEK_DAYS[dayIndex].slice(2)}`;
}
