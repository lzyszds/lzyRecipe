import { useState } from 'react';
import { BookmarkSimple, Play, Trash, FloppyDisk } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { Button } from './ui/Button';
import { UI_ICON_WEIGHT } from '../lib/icons';
import { countPlanMeals } from '../lib/weeklyPlan';
import { useWeeklyPlanTemplatesStore } from '../store/weeklyPlanTemplatesStore';
import type { WeeklyPlanDay } from '../store/weeklyPlanStore';

interface WeeklyPlanTemplatesProps {
  plans: WeeklyPlanDay[];
  onApply: (plans: WeeklyPlanDay[]) => void;
}

export function WeeklyPlanTemplates({ plans, onApply }: WeeklyPlanTemplatesProps) {
  const { templates, saveTemplate, applyTemplate, removeTemplate } =
    useWeeklyPlanTemplatesStore();
  const [name, setName] = useState('');
  const [toast, setToast] = useState('');

  const { planned } = countPlanMeals(plans);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2600);
  };

  const handleSave = () => {
    const id = saveTemplate(name, plans);
    if (!id) {
      showToast('请先安排菜单并填写方案名称');
      return;
    }
    setName('');
    showToast('周计划方案已收藏');
  };

  const handleApply = (id: string) => {
    const next = applyTemplate(id);
    if (!next) {
      showToast('方案不存在或已删除');
      return;
    }
    onApply(next);
    showToast('已套用收藏方案');
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold text-text-primary">收藏周计划</p>
        <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
          保存当前三餐安排，下次一键套用相同菜单（会覆盖本周计划）
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field flex-1 !h-10 !bg-surface"
          placeholder="给方案起个名字，如「工作日轻食」"
          maxLength={24}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={planned === 0}
          icon={<FloppyDisk size={16} weight={UI_ICON_WEIGHT} />}
          onClick={handleSave}
          className="flex-shrink-0"
        >
          收藏
        </Button>
      </div>

      {templates.length > 0 ? (
        <ul className="space-y-2">
          {templates.map((tpl) => {
            const stats = countPlanMeals(tpl.plans);
            return (
              <li
                key={tpl.id}
                className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5"
              >
                <BookmarkSimple
                  size={20}
                  weight="duotone"
                  className="text-primary flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{tpl.name}</p>
                  <p className="text-[11px] text-text-secondary font-medium">
                    {stats.planned} 餐 ·{' '}
                    {new Date(tpl.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleApply(tpl.id)}
                  className="btn-icon !w-8 !h-8 !bg-white !text-primary"
                  aria-label="套用方案"
                  title="套用"
                >
                  <Play size={16} weight={UI_ICON_WEIGHT} className="text-primary" />
                </button>
                <button
                  type="button"
                  onClick={() => removeTemplate(tpl.id)}
                  className="btn-icon !w-8 !h-8 !bg-white !text-cocoa-400"
                  aria-label="删除方案"
                  title="删除"
                >
                  <Trash size={16} weight={UI_ICON_WEIGHT} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-text-secondary font-medium py-2">
          还没有收藏的方案，规划好本周菜单后点「收藏」即可保存
        </p>
      )}

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
