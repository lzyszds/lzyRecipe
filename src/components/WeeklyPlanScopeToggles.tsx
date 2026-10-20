import { clsx } from 'clsx';
import { useWeeklyPlanStore } from '../store/weeklyPlanStore';
import { WEEKLY_PLAN_OPTIONAL_GROUPS } from '../lib/weeklyPlan';

export function WeeklyPlanScopeToggles({ className }: { className?: string }) {
  const { includeOptionalGroups, setIncludeOptionalGroup } = useWeeklyPlanStore();

  return (
    <div className={clsx('space-y-2.5', className)}>
      <div>
        <p className="text-sm font-bold text-text-primary">可选品类</p>
        <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
          控制早点、饮品、甜点是否出现在选菜与随机填充中
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {WEEKLY_PLAN_OPTIONAL_GROUPS.map((group) => {
          const active = includeOptionalGroups[group.key];
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => setIncludeOptionalGroup(group.key, !active)}
              className={clsx(
                'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-medium transition-colors',
                active
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary'
              )}
              aria-pressed={active}
            >
              <span>{group.label}</span>
              <span className="opacity-70">· {group.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
