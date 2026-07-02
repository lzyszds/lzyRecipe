import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { categories } from '../data/recipes';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { DifficultyLevel, Ingredient, Step } from '../types';
import { CoverImageField } from '../components/CoverImageField';
import {
  generateCoverImageDataUrlWithRetry,
  getDefaultCoverPlaceholder,
} from '../lib/coverImage';

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
      },
    ]);

    setSaving(false);
    navigate(`/recipe/${id}`);
  };

  return (
    <div className="min-h-screen pb-8">
      <div
        className="sticky top-0 bg-white/80 backdrop-blur-md z-50 px-4 pt-4 pb-3 border-b border-surface/30"
        style={{ top: 'var(--safe-top)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-surface/50 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-text-primary" />
          </button>
          <h1 className="font-serif text-xl font-semibold text-text-primary flex-1">
            写菜谱
          </h1>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>

      <main className="px-4 py-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
        )}

        <section className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              菜谱名称 *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="例如：番茄炒蛋"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                分类
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                难度
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="input-field"
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
            <label className="block text-sm font-medium text-text-primary mb-2">
              烹饪时间（分钟）
            </label>
            <input
              type="number"
              min={1}
              value={cookTime}
              onChange={(e) => setCookTime(Number(e.target.value))}
              className="input-field"
            />
          </div>

          <CoverImageField
            recipeName={name}
            category={category}
            coverImage={coverImage}
            onCoverImageChange={setCoverImage}
          />

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-24 resize-none"
              placeholder="简单介绍这道菜..."
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold">食材</h2>
            <button
              type="button"
              onClick={() => setIngredients((prev) => [...prev, { name: '', amount: '' }])}
              className="flex items-center gap-1 text-sm text-primary"
            >
              <Plus className="w-4 h-4" />
              添加
            </button>
          </div>
          {ingredients.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={item.name}
                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                className="input-field flex-1"
                placeholder="食材名称"
              />
              <input
                value={item.amount}
                onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                className="input-field w-28"
                placeholder="用量"
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setIngredients((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="p-3 text-red-500 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold">步骤</h2>
            <button
              type="button"
              onClick={() =>
                setSteps((prev) => [...prev, { order: prev.length + 1, description: '' }])
              }
              className="flex items-center gap-1 text-sm text-primary"
            >
              <Plus className="w-4 h-4" />
              添加
            </button>
          </div>
          {steps.map((item, index) => (
            <div key={index} className="flex gap-2 items-start">
              <span className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-2">
                {index + 1}
              </span>
              <textarea
                value={item.description}
                onChange={(e) => updateStep(index, e.target.value)}
                className="input-field flex-1 min-h-20 resize-none"
                placeholder={`第 ${index + 1} 步...`}
              />
              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
                  className="p-3 text-red-500 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </section>

        <section>
          <label className="block text-sm font-medium text-text-primary mb-2">
            小贴士
          </label>
          <textarea
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            className="input-field min-h-20 resize-none"
            placeholder="可选"
          />
        </section>
      </main>
    </div>
  );
}
