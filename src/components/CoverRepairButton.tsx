import { useEffect, useRef, useState } from 'react';
import { ArrowsClockwise, CircleNotch, Image, UploadSimple } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { IconButton } from './ui/IconButton';
import { UI_ICON_WEIGHT } from '../lib/icons';
import {
  clearDisplayCoverCache,
  pickCoverFromFile,
  repairRecipeCover,
} from '../lib/coverImage';
import { recipes } from '../data/recipes';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { useRecipeCoverOverridesStore } from '../store/recipeCoverOverridesStore';

interface CoverRepairButtonProps {
  recipeId: string;
  recipeName: string;
  category?: string;
  onRepairingChange?: (repairing: boolean) => void;
  onProgress?: (message: string) => void;
  onResult?: (message: string, ok: boolean) => void;
}

function isImportedRecipe(recipeId: string): boolean {
  return !recipes.some((r) => r.id === recipeId);
}

export function CoverRepairButton({
  recipeId,
  recipeName,
  category,
  onRepairingChange,
  onProgress,
  onResult,
}: CoverRepairButtonProps) {
  const [open, setOpen] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const setCoverOverride = useRecipeCoverOverridesStore((s) => s.setCoverOverride);
  const updateImportedRecipeCover = useImportedRecipesStore((s) => s.updateImportedRecipeCover);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const applyCover = (coverImage: string) => {
    setCoverOverride(recipeId, coverImage);
    if (isImportedRecipe(recipeId)) {
      updateImportedRecipeCover(recipeId, coverImage);
    }
    clearDisplayCoverCache(recipeName);
  };

  const runRepair = async (mode: 'search' | 'pick') => {
    setOpen(false);
    setRepairing(true);
    onRepairingChange?.(true);
    onProgress?.(mode === 'search' ? '正在重新搜索封面…' : '正在读取图片…');

    try {
      const coverImage =
        mode === 'search'
          ? await repairRecipeCover(recipeName, category, onProgress)
          : await pickCoverFromFile();

      if (!coverImage) {
        onResult?.('未选择图片', false);
        return;
      }

      applyCover(coverImage);
      onResult?.('封面已更新', true);
    } catch (err) {
      onResult?.(
        err instanceof Error ? err.message : '封面修复失败，请稍后重试',
        false
      );
    } finally {
      setRepairing(false);
      onRepairingChange?.(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <IconButton
        icon={
          repairing ? (
            <CircleNotch size={20} weight={UI_ICON_WEIGHT} className="animate-spin" />
          ) : (
            <ArrowsClockwise size={20} weight={UI_ICON_WEIGHT} />
          )
        }
        label="修复封面"
        tone="default"
        disabled={repairing}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="!bg-white/90 backdrop-blur-md !text-cocoa-900 !border-transparent !shadow-none"
      />

      {open && (
        <div
          role="menu"
          className={clsx(
            'absolute right-0 top-[calc(100%+0.5rem)] z-50 w-40',
            'rounded-xl border border-oat-100 bg-white p-1.5 shadow-float'
          )}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-text-primary hover:bg-surface transition-colors"
            onClick={() => runRepair('search')}
          >
            <Image size={16} weight="regular" className="text-primary shrink-0" />
            重新搜索
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-text-primary hover:bg-surface transition-colors"
            onClick={() => runRepair('pick')}
          >
            <UploadSimple size={16} weight={UI_ICON_WEIGHT} className="text-primary shrink-0" />
            选择图片
          </button>
        </div>
      )}
    </div>
  );
}
