/**
 * 便当盒真实日期实用函数库
 */

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function toLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function getTodayString(): string {
  return toLocalDateString(new Date());
}

/** 获取指定日期所在周的周一日期字符串 YYYY-MM-DD */
export function getMondayOf(dateStrOrDate: string | Date): string {
  const date = typeof dateStrOrDate === 'string' ? parseLocalDate(dateStrOrDate) : new Date(dateStrOrDate);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return toLocalDateString(monday);
}

/** 根据该周周一的日期字符串，生成周一到周日 7 天的日期数组 */
export function getWeekDates(mondayStr: string): string[] {
  const dates: string[] = [];
  const monday = parseLocalDate(mondayStr);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(toLocalDateString(d));
  }
  return dates;
}

/** 增加或减少指定天数 */
export function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

/** 格式化月.日，如 "10.23" */
export function formatMonthDay(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

/** 格式化周区间，如 "10.20 - 10.26" */
export function formatWeekRange(mondayStr: string): string {
  const sundayStr = addDays(mondayStr, 6);
  return `${formatMonthDay(mondayStr)} - ${formatMonthDay(sundayStr)}`;
}

/** 获取星期几，如 "周一" */
export function getWeekdayName(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return WEEKDAY_NAMES[d.getDay()] || '';
}

/** 是否是今天 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayString();
}
