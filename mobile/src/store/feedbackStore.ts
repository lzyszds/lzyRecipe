import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  message: string;
  duration?: number;
}

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  type?: 'confirm' | 'alert';
  icon?: 'trash' | 'warning' | 'info' | 'cloud' | 'sparkles' | 'check';
  onConfirm?: () => void;
  onCancel?: () => void;
  resolve?: (value: boolean) => void;
}

interface FeedbackState {
  currentToast: ToastOptions | null;
  dialog: DialogOptions | null;
  showToast: (options: string | ToastOptions) => void;
  hideToast: () => void;
  showDialog: (options: DialogOptions) => Promise<boolean>;
  closeDialog: (confirmed: boolean) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  currentToast: null,
  dialog: null,

  showToast: (options) => {
    if (toastTimer) clearTimeout(toastTimer);

    const toast: ToastOptions =
      typeof options === 'string'
        ? { message: options, type: 'success' }
        : { type: 'success', ...options };

    set({ currentToast: toast });

    const duration = toast.duration ?? 2200;
    toastTimer = setTimeout(() => {
      set({ currentToast: null });
      toastTimer = null;
    }, duration);
  },

  hideToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    set({ currentToast: null });
  },

  showDialog: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        dialog: {
          ...options,
          type: options.type ?? 'confirm',
          confirmText: options.confirmText ?? '确定',
          cancelText: options.cancelText ?? '取消',
          resolve,
        },
      });
    });
  },

  closeDialog: (confirmed) => {
    const dialog = get().dialog;
    if (dialog) {
      if (confirmed) {
        dialog.onConfirm?.();
        dialog.resolve?.(true);
      } else {
        dialog.onCancel?.();
        dialog.resolve?.(false);
      }
    }
    set({ dialog: null });
  },
}));

/**
 * 快捷弹出自定义确认对话框 (彻底替代系统原生 Alert.alert)
 * 支持 Promise 用法: if (await confirm({ title: '...', message: '...' })) { ... }
 */
export function confirm(
  options: Omit<DialogOptions, 'type'> | string,
  message?: string
): Promise<boolean> {
  if (typeof options === 'string') {
    return useFeedbackStore.getState().showDialog({
      title: options,
      message: message || '',
      type: 'confirm',
    });
  }
  return useFeedbackStore.getState().showDialog({
    ...options,
    type: 'confirm',
  });
}

/**
 * 快捷弹出自定义信息/提示对话框（单个确定按钮）
 * 支持: await alert('提示标题', '详细说明')
 */
export function alert(
  options: Omit<DialogOptions, 'type'> | string,
  message?: string
): Promise<boolean> {
  if (typeof options === 'string') {
    return useFeedbackStore.getState().showDialog({
      title: options,
      message: message || '',
      type: 'alert',
      confirmText: '我知道了',
    });
  }
  return useFeedbackStore.getState().showDialog({
    ...options,
    type: 'alert',
    confirmText: options.confirmText ?? '我知道了',
  });
}

/**
 * 快捷弹出全局精致 Toast 动态通知
 */
export function toast(options: string | ToastOptions): void {
  useFeedbackStore.getState().showToast(options);
}
