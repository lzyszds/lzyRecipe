import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '@/lib/safeStorage';

/** 活动类型：菜谱增删改 / 便当盒 / AI 使用 / 封面 / 收藏 */
export type ActivityType = 'recipe' | 'bento' | 'ai' | 'cover' | 'favorite';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  /** 动作短语，如「添加菜谱」「便当打卡·已吃掉」 */
  action: string;
  /** 主体内容，如菜名、数量摘要 */
  detail: string;
  /** 扩展信息：渠道、模型、日期、餐位等 */
  meta?: Record<string, string | number>;
  /** 毫秒时间戳 */
  at: number;
}

export interface ActivityLogInput {
  type: ActivityType;
  action: string;
  detail: string;
  meta?: Record<string, string | number>;
}

interface ActivityLogState {
  entries: ActivityEntry[];
  log: (entry: ActivityLogInput) => void;
  clearLog: () => void;
}

const MAX_LOG_ENTRIES = 500;

export const useActivityLogStore = create<ActivityLogState>()(
  persist(
    (set) => ({
      entries: [],
      log: (entry) =>
        set((state) => ({
          entries: [
            {
              id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              at: Date.now(),
              ...entry,
            },
            ...state.entries,
          ].slice(0, MAX_LOG_ENTRIES),
        })),
      clearLog: () => set({ entries: [] }),
    }),
    {
      name: 'activity-log-storage-v1',
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({ entries: state.entries }),
    }
  )
);

/** 快捷记录（可在任意非组件环境调用） */
export function logActivity(entry: ActivityLogInput): void {
  useActivityLogStore.getState().log(entry);
}

/** 本周一 00:00 的时间戳（周一为一周开始） */
export function getWeekStart(date = new Date()): number {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 周一=0 … 周日=6
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * 按周筛选记录：weekOffset 0 = 本周，1 = 上周，2 = 更早…
 */
export function getEntriesForWeek(
  entries: ActivityEntry[],
  weekOffset: number,
  type?: ActivityType
): ActivityEntry[] {
  const start = getWeekStart() - weekOffset * 7 * 86400000;
  const end = start + 7 * 86400000;
  return entries.filter(
    (e) => e.at >= start && e.at < end && (!type || e.type === type)
  );
}

/** 活动类型 → 中文标签 */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  recipe: '菜谱',
  bento: '便当盒',
  ai: 'AI',
  cover: '封面',
  favorite: '收藏',
};
