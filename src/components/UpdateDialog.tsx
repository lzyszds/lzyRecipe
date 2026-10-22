import { useState } from 'react';
import { CircleNotch, CloudArrowDown, DownloadSimple, Lightning, Warning } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { isTauri } from '../lib/tauri';
import {
  CURRENT_VERSION,
  downloadAndInstall,
  downloadWebBundle,
  formatDate,
  formatSize,
  openReleasePage,
  useUpdaterStore,
  type UpdateInfo,
} from '../lib/updater';

interface UpdateDialogProps {
  info: UpdateInfo | null;
  onClose: () => void;
}

type Mode = 'web' | 'install';

export function UpdateDialog({ info, onClose }: UpdateDialogProps) {
  const { phase, progress, message, error } = useUpdaterStore();
  const busy = phase === 'downloading' || phase === 'installing';
  const [mode, setMode] = useState<Mode>('web');

  const webAvailable = Boolean(info?.webBundle) && isTauri();
  const canInstall = isTauri();
  const packageInfo = info?.apk ?? info?.installer;
  const activeMode: Mode = webAvailable ? mode : 'install';

  const handlePrimary = () => {
    if (!info) return;
    if (activeMode === 'web') void downloadWebBundle(info).catch(() => {});
    else void downloadAndInstall(info);
  };

  return (
    <BottomSheet
      isOpen={Boolean(info)}
      onClose={() => !busy && onClose()}
      title={info ? `发现新版本 v${info.version}` : ''}
      description={
        info
          ? `当前 v${CURRENT_VERSION}${info.publishedAt ? ` · 发布于 ${formatDate(info.publishedAt)}` : ''}`
          : ''
      }
      bodyClassName="space-y-3"
    >
      {info && (
        <>
          <div className="rounded-xl bg-white border border-oat-100 p-3 max-h-[30vh] overflow-y-auto">
            <p className="text-[11px] font-semibold text-cocoa-900 mb-1.5">更新内容</p>
            <p className="text-[11px] text-cocoa-700 leading-relaxed whitespace-pre-wrap break-words">
              {info.notes
                .replace(/<!--[\s\S]*?-->/g, '')
                .replace(/build-id:[^\s]+/g, '')
                .trim() || '本次更新没有填写说明'}
            </p>
          </div>

          {/* 两种更新方式，默认推荐免安装 */}
          <div className="grid grid-cols-2 gap-1.5">
            {webAvailable && (
              <button
                type="button"
                onClick={() => setMode('web')}
                disabled={busy}
                className={clsx(
                  'rounded-xl p-2.5 text-left border transition',
                  activeMode === 'web'
                    ? 'bg-apricot-50 border-apricot-400'
                    : 'bg-white border-oat-200/70'
                )}
              >
                <span className="flex items-center gap-1 text-xs font-bold text-cocoa-900">
                  <Lightning size={13} weight="fill" className="text-apricot-500" />
                  免安装更新
                </span>
                <span className="block text-[10px] text-cocoa-400 mt-1 leading-snug">
                  只更新界面和功能，不用装 APK
                  {info.webBundle ? ` · ${formatSize(info.webBundle.size)}` : ''}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode('install')}
              disabled={busy || !packageInfo}
              className={clsx(
                'rounded-xl p-2.5 text-left border transition',
                webAvailable ? '' : 'col-span-2',
                activeMode === 'install'
                  ? 'bg-apricot-50 border-apricot-400'
                  : 'bg-white border-oat-200/70'
              )}
            >
              <span className="flex items-center gap-1 text-xs font-bold text-cocoa-900">
                <DownloadSimple size={13} weight="bold" className="text-cocoa-700" />
                安装包更新
              </span>
              <span className="block text-[10px] text-cocoa-400 mt-1 leading-snug">
                {packageInfo
                  ? `更新完整的 App · ${formatSize(packageInfo.size)}`
                  : '这个版本没有安装包'}
              </span>
            </button>
          </div>

          {activeMode === 'web' && (
            <p className="text-[10px] text-cocoa-400 px-1 leading-relaxed">
              免安装更新只替换前端界面，解开后立即生效；涉及原生能力变化（如新增系统接口）时请选择安装包更新。
            </p>
          )}

          {busy && (
            <div className="space-y-1.5">
              <div className="h-1.5 rounded-full bg-oat-100 overflow-hidden">
                <div
                  className="h-full bg-apricot-500 transition-all"
                  style={{ width: `${Math.max(5, progress)}%` }}
                />
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-cocoa-400">
                <CircleNotch size={12} weight="bold" className="animate-spin" />
                {message}
              </p>
            </div>
          )}

          {!busy && message && (
            <p className="text-[11px] text-sage-600 bg-sage-50 rounded-lg p-2.5 leading-relaxed">
              {message}
            </p>
          )}

          {error && (
            <p className="flex items-start gap-1.5 text-[11px] text-red-500 bg-red-50 rounded-lg p-2.5 leading-relaxed">
              <Warning size={13} weight="bold" className="mt-0.5 shrink-0" />
              <span className="break-all">{error}</span>
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose} disabled={busy}>
              以后再说
            </Button>
            {canInstall ? (
              <Button
                className="flex-1"
                onClick={handlePrimary}
                disabled={busy || (activeMode === 'install' && !packageInfo)}
                icon={
                  busy ? (
                    <CircleNotch size={15} weight="bold" className="animate-spin" />
                  ) : activeMode === 'web' ? (
                    <Lightning size={15} weight="fill" />
                  ) : (
                    <DownloadSimple size={15} weight="bold" />
                  )
                }
              >
                {busy ? '处理中…' : activeMode === 'web' ? '立即更新（免安装）' : '下载并安装'}
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={() => openReleasePage(info.htmlUrl)}
                icon={<CloudArrowDown size={15} weight="bold" />}
              >
                去下载
              </Button>
            )}
          </div>
        </>
      )}
    </BottomSheet>
  );
}
