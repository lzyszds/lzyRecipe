import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkle, Plus, Trash, CircleNotch } from '@phosphor-icons/react';
import { categories } from '../data/recipes';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { useSettingsStore, isAiConfigured } from '../store/settingsStore';
import { DifficultyLevel, Ingredient, Step } from '../types';
import { CoverImageField } from '../components/CoverImageField';
import { PageHeader } from '../components/ui/PageHeader';
import { PageMain } from '../components/ui/PageLayout';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { SectionHeader } from '../components/ui/PageHeader';
import { BottomSheet } from '../components/ui/BottomSheet';
import {
  generateCoverImageDataUrlWithRetry,
  getDefaultCoverPlaceholder,
} from '../lib/coverImage';
import { generateRecipeDraft, normalizeDraft } from '../lib/aiRecipes';

const difficultyOptions: { value: DifficultyLevel; label: string }[] = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
];

export function CreateRecipe() {
  const navigate = useNavigate();
  const addImportedRecipes = useImportedRecipesStore((s) => s.addImportedRecipes);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0]?.name ?? '家常菜');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tips, setTips] = useState('');
  const [cookTime, setCookTime] = useState(30);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', amount: '' },
  ]);
  const [steps, setSteps] = useState<Step[]>([{ order: 1, description: '' }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  // AI 一键生成
  const [aiOpen, setAiOpen] = useState(false);
  const [aiIdea, setAiIdea] = useState('');
  const [aiServings, setAiServings] = useState('2 人份');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  // 订阅设置变化：在设置页填完 Key 返回后立即生效
  const aiSettings = useSettingsStore((s) => s.ai);
  const aiReady = isAiConfigured(aiSettings);

  const handleAiGenerate = async () => {
    if (!aiIdea.trim()) {
      setAiError('先写一个菜名或食材，例如「番茄牛腩」「剩下的鸡胸肉」');
      return;
    }
    setAiBusy(true);
    setAiError('');
    try {
      const draft = await generateRecipeDraft({
        idea: aiIdea,
        category,
        servings: aiServings,
      });
      const form = normalizeDraft(draft, aiIdea);
      setName(form.name);
      if (form.category && categories.some((c) => c.name === form.category)) {
        setCategory(form.category);
      }
      setDescription(form.description);
      setCookTime(form.cookTime);
      setDifficulty(form.difficulty);
      setTips(form.tips);
      setIngredients(form.ingredients);
      setSteps(form.steps.map((description, index) => ({ order: index + 1, description })));
      setCoverImage('');
      setAiGenerated(true);
      setAiOpen(false);
      setAiIdea('');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiBusy(false);
    }
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    setIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const updateStep = (index: number, description: string) => {
    setSteps((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, order: i + 1, description } : item
      )
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('请填写菜谱名称');
      return;
    }

    const validIngredients = ingredients.filter((i) => i.name.trim());
    const validSteps = steps.filter((s) => s.description.trim());

    if (validIngredients.length === 0) {
      setError('请至少添加一种食材');
      return;
    }
    if (validSteps.length === 0) {
      setError('请至少添加一个步骤');
      return;
    }

    setSaving(true);
    setError('');

    let finalCover = coverImage.trim();
    if (!finalCover) {
      try {
        finalCover = await generateCoverImageDataUrlWithRetry(name.trim(), category);
      } catch {
        finalCover = getDefaultCoverPlaceholder();
      }
    }

    const id = `user-${Date.now()}`;
    addImportedRecipes([
      {
        id,
        name: name.trim(),
        category,
        coverImage: finalCover,
        description: description.trim(),
        ingredients: validIngredients,
        steps: validSteps.map((s, index) => ({ ...s, order: index + 1 })),
        tips: tips.trim(),
        cookTime: cookTime || 30,
        difficulty,
        createdAt: new Date().toISOString().split('T')[0],
        ...(aiGenerated ? { aiGenerated: true } : {}),
      },
    ]);

    setSaving(false);
    navigate(`/recipe/${id}`);
  };

  return (
    <div className="pb-8">
      <PageHeader
        title="写菜谱"
        showBack
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={saving}
            icon={saving ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : undefined}
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        }
      />

      <PageMain className="space-y-5">
        {error && (
          <div className="p-3.5 bg-red-50 text-red-600 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <section className="card card-body flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-cocoa-900 flex items-center gap-1">
              <Sparkle size={14} weight="fill" className="text-apricot-500" />
              AI 一键生成
            </p>
            <p className="text-[11px] text-cocoa-400 mt-1">
              {aiReady ? '给个菜名或食材，自动写好食材、步骤和小贴士' : '需先在「设置 → AI 助手」里配置接口和 Key'}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setAiError('');
              setAiOpen(true);
            }}
            disabled={!aiReady}
          >
            生成
          </Button>
        </section>

        <section className="card card-body space-y-4">
          <div>
            <label className="form-label">菜谱名称 *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field !bg-surface"
              placeholder="例如：番茄炒蛋"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field !bg-surface"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">难度</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="input-field !bg-surface"
              >
                {difficultyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">烹饪时间（分钟）</label>
            <input
              type="number"
              min={1}
              value={cookTime}
              onChange={(e) => setCookTime(Number(e.target.value))}
              className="input-field !bg-surface"
            />
          </div>

          <CoverImageField
            recipeName={name}
            category={category}
            coverImage={coverImage}
            onCoverImageChange={setCoverImage}
          />

          <div>
            <label className="form-label">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-area !bg-surface"
              placeholder="简单介绍这道菜..."
            />
          </div>
        </section>

        <section className="card card-body space-y-3">
          <SectionHeader
            title="食材"
            action={
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={16} weight="bold" />}
                onClick={() => setIngredients((prev) => [...prev, { name: '', amount: '' }])}
              >
                添加
              </Button>
            }
          />
          {ingredients.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={item.name}
                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                className="input-field !bg-surface flex-1"
                placeholder="食材名称"
              />
              <input
                value={item.amount}
                onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                className="input-field !bg-surface w-24 md:w-28"
                placeholder="用量"
              />
              {ingredients.length > 1 && (
                <IconButton
                  icon={<Trash size={16} weight="bold" className="text-red-500" />}
                  label="删除食材"
                  tone="danger"
                  onClick={() =>
                    setIngredients((prev) => prev.filter((_, i) => i !== index))
                  }
                />
              )}
            </div>
          ))}
        </section>

        <section className="card card-body space-y-3">
          <SectionHeader
            title="步骤"
            action={
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={16} weight="bold" />}
                onClick={() =>
                  setSteps((prev) => [...prev, { order: prev.length + 1, description: '' }])
                }
              >
                添加
              </Button>
            }
          />
          {steps.map((item, index) => (
            <div key={index} className="flex gap-2 items-start">
              <span className="w-7 h-7 rounded-full bg-sage-50 text-primary text-xs font-medium flex items-center justify-center flex-shrink-0 mt-2">
                {index + 1}
              </span>
              <textarea
                value={item.description}
                onChange={(e) => updateStep(index, e.target.value)}
                className="input-area !bg-surface flex-1 min-h-[5rem]"
                placeholder={`第 ${index + 1} 步...`}
              />
              {steps.length > 1 && (
                <IconButton
                  icon={<Trash size={16} weight="bold" className="text-red-500" />}
                  label="删除步骤"
                  tone="danger"
                  className="mt-1"
                  onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
                />
              )}
            </div>
          ))}
        </section>

        <section className="card card-body">
          <label className="form-label">小贴士</label>
          <textarea
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            className="input-area !bg-surface min-h-[5rem]"
            placeholder="可选"
          />
        </section>

        <Button
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          disabled={saving}
          icon={
            saving ? (
              <CircleNotch size={16} weight="bold" className="animate-spin" />
            ) : undefined
          }
        >
          {saving ? '保存中…' : '保存菜谱'}
        </Button>
      </PageMain>

      <BottomSheet
        isOpen={aiOpen}
        onClose={() => !aiBusy && setAiOpen(false)}
        title="AI 写菜谱"
        description="生成后可继续修改，再点保存"
        bodyClassName="space-y-3"
      >
        <div>
          <label className="form-label">菜名或现有食材</label>
          <textarea
            value={aiIdea}
            onChange={(e) => setAiIdea(e.target.value)}
            className="input-area !min-h-[5rem] bg-white"
            placeholder="例如：番茄牛腩 / 冰箱里有鸡蛋、青椒和米饭"
            disabled={aiBusy}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="form-label !mb-0 shrink-0">份量</label>
          <input
            value={aiServings}
            onChange={(e) => setAiServings(e.target.value)}
            className="input-field bg-white flex-1"
            placeholder="2 人份"
            disabled={aiBusy}
          />
        </div>
        {aiError && (
          <p className="text-[11px] text-red-500 bg-red-50 rounded-lg p-2.5 leading-relaxed">
            {aiError}
          </p>
        )}
        <Button
          className="w-full"
          onClick={handleAiGenerate}
          disabled={aiBusy}
          icon={
            aiBusy ? (
              <CircleNotch size={16} weight="bold" className="animate-spin" />
            ) : (
              <Sparkle size={16} weight="fill" />
            )
          }
        >
          {aiBusy ? '正在生成…' : '生成菜谱'}
        </Button>
      </BottomSheet>
    </div>
  );
}
