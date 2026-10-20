import { useEffect, useState } from 'react';
import { CircleNotch, DownloadSimple, ShareNetwork } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import type { Recipe } from '../types';
import type { WeeklyPlanDay } from '../store/weeklyPlanStore';
import { Button } from './ui/Button';
import { UI_ICON_WEIGHT } from '../lib/icons';
import { saveWeeklyPlanImage, shareWeeklyPlan } from '../lib/weeklyPlanShare';

interface WeeklyPlanShareBarProps {
  weekKey: string;
  plans: WeeklyPlanDay[];
  recipes: Recipe[];
  disabled?: boolean;
}

export function WeeklyPlanShareBar({
  weekKey,
  plans,
  recipes,
  disabled,
}: WeeklyPlanShareBarProps) {
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const imageData = { weekKey, plans, recipes };

  const handleShare = async () => {
    setBusy('share');
    try {
      const result = await shareWeeklyPlan(imageData);
      if (result === 'shared') setToast('已唤起分享');
      else if (result === 'copied') setToast('菜单文字已复制，图片已下载');
      else setToast('图片已下载到本地');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setToast(err instanceof Error ? err.message : '分享失败');
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    setBusy('save');
    try {
      await saveWeeklyPlanImage(imageData);
      setToast('周菜单图片已保存');
    } catch (err) {
      setToast(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={disabled || busy !== null}
          icon={
            busy === 'share' ? (
              <CircleNotch size={16} weight="bold" className="animate-spin" />
            ) : (
              <ShareNetwork size={16} weight={UI_ICON_WEIGHT} />
            )
          }
          onClick={handleShare}
        >
          一键分享
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || busy !== null}
          icon={
            busy === 'save' ? (
              <CircleNotch size={16} weight="bold" className="animate-spin" />
            ) : (
              <DownloadSimple size={16} weight={UI_ICON_WEIGHT} />
            )
          }
          onClick={handleSave}
        >
          保存图片
        </Button>
      </div>
      <p className="text-[11px] text-text-secondary leading-relaxed">
        生成卡通风格周菜单卡片，可分享到微信 / 保存到相册
      </p>
      {toast && (
        <p
          className={clsx(
            'text-[11px] font-medium px-3 py-2 rounded-xl',
            'bg-sage-50 text-sage-600'
          )}
        >
          {toast}
        </p>
      )}
    </div>
  );
}
