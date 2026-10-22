import { useEffect, useState } from 'react';
import { ArrowRight, X } from '@phosphor-icons/react';
import { checkForUpdate, useUpdaterStore, type UpdateInfo } from '../lib/updater';
import { UpdateDialog } from './UpdateDialog';
import { UI_ICON_WEIGHT } from '../lib/icons';

const DISMISS_KEY = 'update-dismissed-version';

/**
 * 首页顶部的更新提示条：静默检查，有新版本时显示一行提示，点击打开更新弹窗。
 * 用户关闭后，同一版本在本次运行中不再提示。
 */
export function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      checkForUpdate({ includePrerelease: false })
        .then((next) => {
          if (cancelled || !next) return;
          setInfo(next);
          if (sessionStorage.getItem(DISMISS_KEY) === next.version) setDismissed(true);
        })
        .catch(() => {
          // 网络不可用时静默忽略
        });
    }, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    if (info) sessionStorage.setItem(DISMISS_KEY, info.version);
    setDismissed(true);
  };

  return (
    <>
      {info && !dismissed && (
        <div className="flex items-center gap-2 rounded-xl bg-apricot-50 border border-apricot-200/70 px-3 py-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 min-w-0 flex items-center gap-1.5 text-left"
          >
            <span className="text-[11px] font-semibold text-apricot-600 shrink-0">
              新版本 v{info.version}
            </span>
            <span className="text-[11px] text-cocoa-700 truncate flex-1">
              点此查看更新内容并升级
            </span>
            <ArrowRight size={12} weight={UI_ICON_WEIGHT} className="text-apricot-500 shrink-0" />
          </button>
          <button
            type="button"
            aria-label="稍后提醒"
            onClick={dismiss}
            className="w-6 h-6 rounded-md flex items-center justify-center text-cocoa-400 hover:bg-apricot-100 shrink-0"
          >
            <X size={12} weight={UI_ICON_WEIGHT} />
          </button>
        </div>
      )}

      <UpdateDialog
        info={open ? info : null}
        onClose={() => {
          setOpen(false);
          // 已下载或已交给系统安装时，不再重复提示
          if (useUpdaterStore.getState().message) dismiss();
        }}
      />
    </>
  );
}
