import { useState, useEffect } from 'react';
import { FileCode, ClipboardText, UploadSimple, Check, WarningCircle } from '@phosphor-icons/react';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { Recipe } from '../types';
import { clsx } from 'clsx';
import { isTauri } from '../lib/tauri';
import { BottomSheet } from './ui/BottomSheet';

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
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="导入菜谱"
      description="支持 JSON 文件或粘贴数据"
      bodyClassName="space-y-4"
    >
      {/* Mode Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface">
        {canUseFileImport && (
          <button
            type="button"
            onClick={() => {
              setMode('file');
              setStatus('idle');
              setErrorMessage('');
            }}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-medium transition-all',
              mode === 'file'
                ? 'bg-white text-text-primary shadow-cozy-sm'
                : 'text-text-secondary'
            )}
          >
            <FileCode size={16} weight="bold" />
            文件导入
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setMode('paste');
            setStatus('idle');
            setErrorMessage('');
          }}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-medium transition-all',
            mode === 'paste'
              ? 'bg-white text-text-primary shadow-cozy-sm'
              : 'text-text-secondary'
          )}
        >
          <ClipboardText size={16} weight="bold" />
          粘贴导入
        </button>
      </div>

      {/* File Mode */}
      {mode === 'file' && (
        <div className="space-y-4">
          <div
            onClick={handleFileImport}
            className="border-2 border-dashed border-neutral-200 hover:border-primary/40 hover:bg-sage-50/50 rounded-2xl p-8 text-center cursor-pointer transition-colors"
          >
            <UploadSimple size={40} weight="duotone" className="mx-auto mb-3 text-neutral-400" />
            <p className="text-sm font-medium text-text-primary mb-1">
              点击选择 JSON 文件
            </p>
            <p className="text-xs text-text-secondary">
              支持从其他菜谱应用导出的 JSON 格式
            </p>
          </div>

          <div className="bg-surface rounded-2xl p-4">
            <p className="text-xs font-medium text-text-primary mb-2">JSON 格式说明</p>
            <pre className="text-[11px] text-text-secondary overflow-x-auto leading-relaxed">
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
            className="w-full h-48 p-4 bg-surface rounded-xl text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          <button
            type="button"
            onClick={handlePasteImport}
            disabled={!pasteText.trim()}
            className="w-full btn btn-md btn-primary"
          >
            导入菜谱
          </button>
        </div>
      )}

      {/* Status Messages */}
      {status === 'success' && (
        <div className="flex items-center gap-3 p-3.5 bg-sage-50 rounded-xl text-sage-600">
          <Check size={18} weight="bold" className="flex-shrink-0" />
          <span className="text-xs font-medium">成功导入 {importCount} 个菜谱</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-3 p-3.5 bg-red-50 rounded-xl text-red-600">
          <WarningCircle size={18} weight="bold" className="flex-shrink-0 mt-0.5" />
          <span className="text-xs leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <p className="text-[11px] text-text-secondary text-center">
        导入的菜谱将保存在本地，可在「我的导入」中查看
      </p>
    </BottomSheet>
  );
}
