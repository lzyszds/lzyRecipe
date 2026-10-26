import { create } from 'zustand';
import { toast } from './feedbackStore';

interface AiTaskState {
  /** 当前并行执行中的 AI 任务数 */
  runningCount: number;
  /** 最近一个任务的可读名称（用于提醒用户正在生成什么） */
  currentLabel: string | null;
  beginAiTask: (label?: string) => void;
  endAiTask: () => void;
}

/**
 * 全局 AI 任务忙碌状态：
 * 任一 AI 生成任务执行期间，其它 AI 入口被守卫拦截并提示「请稍候」，
 * 避免并发请求导致渠道限流、结果互相覆盖。
 */
export const useAiTaskStore = create<AiTaskState>((set) => ({
  runningCount: 0,
  currentLabel: null,
  beginAiTask: (label) =>
    set((s) => ({
      runningCount: s.runningCount + 1,
      currentLabel: label ?? s.currentLabel,
    })),
  endAiTask: () =>
    set((s) => {
      const next = Math.max(0, s.runningCount - 1);
      return { runningCount: next, currentLabel: next > 0 ? s.currentLabel : null };
    }),
}));

/**
 * AI 忙碌守卫：已有任务在跑时弹出提醒并返回 false（不启动新任务）。
 * 用法：`if (!ensureAiIdle()) return;`
 */
export function ensureAiIdle(): boolean {
  const { runningCount, currentLabel } = useAiTaskStore.getState();
  if (runningCount > 0) {
    toast({
      type: 'warning',
      message: `已有 AI 在生成「${currentLabel || '其他内容'}」中，请稍候再试`,
    });
    return false;
  }
  return true;
}

/** 包装执行：自动登记/解除忙碌状态，异常时也会正确释放 */
export async function runAiTask<T>(label: string, task: () => Promise<T>): Promise<T> {
  useAiTaskStore.getState().beginAiTask(label);
  try {
    return await task();
  } finally {
    useAiTaskStore.getState().endAiTask();
  }
}
