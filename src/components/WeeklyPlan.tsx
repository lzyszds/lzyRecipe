import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAllRecipes } from '../lib/recipes';
import { useWeeklyPlanStore } from '../store/weeklyPlanStore';

const weekDays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

export function WeeklyPlan() {
  const navigate = useNavigate();
  const allRecipes = useAllRecipes();
  const { plans, initPlan, toggleCompleted } = useWeeklyPlanStore();

  useEffect(() => {
    initPlan(allRecipes.map((r) => r.id));
  }, [allRecipes, initPlan]);

  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const completedCount = plans.filter((p) => p.completed).length;

  const handlePlanClick = (dayIndex: number, recipeId: string) => {
    if (recipeId) {
      navigate(`/recipe/${recipeId}`);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between px-4 py-4 border-b-[3px] border-outline bg-secondary/15">
        <h2 className="font-cartoon text-lg text-text-primary flex items-center gap-2">
          <span className="cartoon-section-bar">📅</span>
          本周烹饪计划
        </h2>
        <span className="cartoon-badge bg-accent text-text-primary">
          {completedCount}/{plans.length} 完成
        </span>
      </div>

      <div className="divide-y-2 divide-outline/15">
        {plans.map((plan) => {
          const recipe = allRecipes.find((r) => r.id === plan.recipeId);
          const index = plan.dayIndex;

          return (
            <div
              key={plan.dayIndex}
              className={clsx(
                'flex items-center px-4 py-3 gap-4 transition-colors',
                plan.completed && 'bg-green-100/60',
                index === todayIndex && 'bg-primary/10'
              )}
            >
              <div className="flex-shrink-0">
                <span
                  className={clsx(
                    'text-xs font-bold px-2.5 py-1 rounded-full border-2 border-outline shadow-cartoon-sm',
                    index === todayIndex
                      ? 'bg-primary text-white'
                      : 'bg-white text-text-secondary'
                  )}
                >
                  {weekDays[index].slice(1, 3)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handlePlanClick(index, plan.recipeId)}
                className="flex-1 min-w-0 text-left"
                disabled={!recipe}
              >
                <p
                  className={clsx(
                    'font-bold text-text-primary truncate',
                    plan.completed && 'line-through text-text-secondary',
                    !recipe && 'text-text-secondary'
                  )}
                >
                  {recipe?.name ?? '暂无计划 🍽️'}
                </p>
                <p className="text-xs text-text-secondary font-medium">
                  {recipe?.category ?? weekDays[index]}
                </p>
              </button>

              <button
                type="button"
                onClick={() => toggleCompleted(plan.dayIndex)}
                disabled={!plan.recipeId}
                className={clsx(
                  'w-7 h-7 rounded-full border-[3px] border-outline flex items-center justify-center flex-shrink-0 transition-all shadow-cartoon-sm',
                  plan.completed
                    ? 'bg-secondary border-outline'
                    : 'bg-white',
                  !plan.recipeId && 'opacity-40 cursor-not-allowed'
                )}
              >
                {plan.completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
