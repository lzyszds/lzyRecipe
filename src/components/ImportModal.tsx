import { useState, useEffect } from 'react';
import { X, FileJson, Clipboard, Upload, Check, AlertCircle } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { Recipe } from '../types';
import { clsx } from 'clsx';
import { isTauri } from '../lib/tauri';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportMode = 'file' | 'paste';
type ImportStatus = 'idle' | 'success' | 'error';

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [mode, setMode] = useState<ImportMode>(isTauri() ? 'file' : 'paste');
  const [pasteText, setPasteText] = useState('');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [importCount, setImportCount] = useState(0);

  const addImportedRecipes = useImportedRecipesStore((s) => s.addImportedRecipes);
  const canUseFileImport = isTauri();

  useEffect(() => {
    if (isOpen) {
      setMode(isTauri() ? 'file' : 'paste');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateAndParseRecipes = (data: unknown): Recipe[] => {
    if (!Array.isArray(data)) {
      throw new Error('数据格式错误：期望一个菜谱数组');
    }

    return data.map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`第 ${index + 1} 项格式错误：不是有效对象`);
      }

      const recipe = item as Record<string, unknown>;

      // 必填字段验证
      if (!recipe.id || typeof recipe.id !== 'string') {
        throw new Error(`第 ${index + 1} 项缺少有效的 id`);
      }
      if (!recipe.name || typeof recipe.name !== 'string') {
        throw new Error(`第 ${index + 1} 项（${recipe.id}）缺少有效的名称`);
      }
      if (!recipe.category || typeof recipe.category !== 'string') {
        throw new Error(`第 ${index + 1} 项（${recipe.id}）缺少有效的分类`);
      }

      // 食材和步骤验证
      const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map((ing: unknown) => {
            if (!ing || typeof ing !== 'object') return { name: '', amount: '' };
            const i = ing as Record<string, unknown>;
            return {
              name: String(i.name || ''),
              amount: String(i.amount || ''),
            };
          })
        : [];

      const steps = Array.isArray(recipe.steps)
        ? recipe.steps.map((step: unknown, si: number) => {
            if (!step || typeof step !== 'object') return { order: si + 1, description: '' };
            const s = step as Record<string, unknown>;
            return {
              order: Number(s.order) || si + 1,
              description: String(s.description || ''),
            };
          })
        : [];

      return {
        id: String(recipe.id),
        name: String(recipe.name),
        category: String(recipe.category),
        coverImage: String(recipe.coverImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'),
        description: String(recipe.description || ''),
        ingredients,
        steps,
        tips: String(recipe.tips || ''),
        cookTime: Number(recipe.cookTime) || 30,
        difficulty: (recipe.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
        createdAt: String(recipe.createdAt || new Date().toISOString().split('T')[0]),
      };
    });
  };

  const handleFileImport = async () => {
    if (!canUseFileImport) {
      setStatus('error');
      setErrorMessage('文件导入需要在 Tauri 桌面应用中运行，请使用粘贴导入或运行 npm run tauri:dev');
      return;
    }

    try {
      setStatus('idle');
      setErrorMessage('');

      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'JSON',
            extensions: ['json'],
          },
        ],
      });

      if (!selected) return;

      const content = await readTextFile(selected as string);
      const data = JSON.parse(content);
      const recipes = validateAndParseRecipes(data);

      if (recipes.length === 0) {
        throw new Error('文件中没有找到有效的菜谱');
      }

      addImportedRecipes(recipes);
      setImportCount(recipes.length);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : '导入失败');
    }
  };

  const handlePasteImport = () => {
    try {
      setStatus('idle');
      setErrorMessage('');

      if (!pasteText.trim()) {
        throw new Error('请输入菜谱 JSON 数据');
      }

      const data = JSON.parse(pasteText);
      const recipes = validateAndParseRecipes(data);

      if (recipes.length === 0) {
        throw new Error('没有找到有效的菜谱');
      }

      addImportedRecipes(recipes);
      setImportCount(recipes.length);
      setStatus('success');
      setPasteText('');
    } catch (err) {
      setStatus('error');
      if (err instanceof SyntaxError) {
        setErrorMessage('JSON 格式错误，请检查输入内容');
      } else {
        setErrorMessage(err instanceof Error ? err.message : '导入失败');
      }
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setErrorMessage('');
    setPasteText('');
    setImportCount(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl border-[3px] border-outline shadow-cartoon-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-[3px] border-outline bg-accent/20">
          <h2 className="font-cartoon text-xl text-text-primary flex items-center gap-2">
            <span>📥</span> 导入菜谱
          </h2>
          <button
            onClick={handleClose}
            className="cartoon-icon-btn -mr-2"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Mode Tabs */}
          <div className="flex gap-2 mb-6">
            {canUseFileImport && (
              <button
                onClick={() => {
                  setMode('file');
                  setStatus('idle');
                  setErrorMessage('');
                }}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold border-[3px] border-outline transition-all',
                  mode === 'file'
                    ? 'bg-primary text-white shadow-cartoon-sm'
                    : 'bg-white text-text-secondary shadow-cartoon-sm hover:-translate-y-0.5'
                )}
              >
                <FileJson className="w-5 h-5" />
                文件导入
              </button>
            )}
            <button
              onClick={() => {
                setMode('paste');
                setStatus('idle');
                setErrorMessage('');
              }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold border-[3px] border-outline transition-all',
                mode === 'paste'
                  ? 'bg-primary text-white shadow-cartoon-sm'
                  : 'bg-white text-text-secondary shadow-cartoon-sm hover:-translate-y-0.5'
              )}
            >
              <Clipboard className="w-5 h-5" />
              粘贴导入
            </button>
          </div>

          {/* File Mode */}
          {mode === 'file' && (
            <div className="space-y-4">
              <div
                onClick={handleFileImport}
                className="border-[3px] border-dashed border-outline hover:border-secondary hover:bg-secondary/5 rounded-3xl p-8 text-center cursor-pointer transition-all shadow-cartoon-sm hover:-translate-y-0.5"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-text-secondary" />
                <p className="text-text-primary font-medium mb-2">
                  点击选择 JSON 文件
                </p>
                <p className="text-sm text-text-secondary">
                  支持从其他菜谱应用导出的 JSON 格式
                </p>
              </div>

              <div className="bg-surface/50 rounded-2xl p-4 border-2 border-outline/30">
                <p className="text-sm font-medium text-text-primary mb-2">JSON 格式说明</p>
                <pre className="text-xs text-text-secondary overflow-x-auto">
{`[
  {
    "id": "recipe001",
    "name": "菜谱名称",
    "category": "川菜",
    "description": "描述",
    "coverImage": "图片URL",
    "ingredients": [
      { "name": "食材", "amount": "用量" }
    ],
    "steps": [
      { "order": 1, "description": "步骤描述" }
    ],
    "tips": "小贴士",
    "cookTime": 30,
    "difficulty": "medium"
  }
]`}
                </pre>
              </div>
            </div>
          )}

          {/* Paste Mode */}
          {mode === 'paste' && (
            <div className="space-y-4">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder='粘贴菜谱 JSON 数据，例如：\n[\n  {\n    "id": "001",\n    "name": "红烧肉",\n    ...\n  }\n]'
                className="w-full h-48 p-4 border-[3px] border-outline rounded-2xl text-sm font-mono resize-none focus:outline-none focus:border-secondary focus:shadow-cartoon-sm"
              />

              <button
                onClick={handlePasteImport}
                disabled={!pasteText.trim()}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                导入菜谱
              </button>
            </div>
          )}

          {/* Status Messages */}
          {status === 'success' && (
            <div className="mt-4 flex items-center gap-3 p-4 bg-green-100 rounded-2xl text-green-800 border-2 border-green-400 font-bold">
              <Check className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">成功导入 {importCount} 个菜谱！</span>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 flex items-start gap-3 p-4 bg-red-100 rounded-2xl text-red-800 border-2 border-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-[3px] border-outline bg-accent/10">
          <p className="text-sm text-text-secondary text-center">
            导入的菜谱将保存在本地，可在我的导入中查看
          </p>
        </div>
      </div>
    </div>
  );
}
