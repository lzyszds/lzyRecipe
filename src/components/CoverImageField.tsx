import { useState } from 'react';
import { Sparkle, CircleNotch, Image, UploadSimple } from '@phosphor-icons/react';
import { generateCoverImageDataUrlWithRetry, pickCoverFromFile } from '../lib/coverImage';
import { isTauri } from '../lib/tauri';

interface CoverImageFieldProps {
  recipeName: string;
  category?: string;
  coverImage: string;
  onCoverImageChange: (url: string) => void;
}

export function CoverImageField({
  recipeName,
  category,
  coverImage,
  onCoverImageChange,
}: CoverImageFieldProps) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [progressMsg, setProgressMsg] = useState('');

  const handleGenerate = async () => {
    if (!recipeName.trim()) {
      setGenError('请先填写菜谱名称');
      return;
    }

    setGenerating(true);
    setGenError('');
    setProgressMsg('准备生成…');

    try {
      const dataUrl = await generateCoverImageDataUrlWithRetry(
        recipeName.trim(),
        category,
        setProgressMsg
      );
      onCoverImageChange(dataUrl);
    } catch (err) {
      setGenError(
        err instanceof Error ? err.message : '封面生成失败，请稍后重试'
      );
    } finally {
      setGenerating(false);
      setProgressMsg('');
    }
  };

  const handlePickFile = async () => {
    setGenError('');
    try {
      const dataUrl = await pickCoverFromFile();
      if (dataUrl) onCoverImageChange(dataUrl);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : '选择图片失败');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-text-secondary">
          封面图片
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePickFile}
            className="flex items-center gap-1.5 text-sm text-text-secondary font-medium hover:text-primary"
          >
            <UploadSimple size={16} weight="bold" />
            选择图片
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !recipeName.trim()}
            className="flex items-center gap-1.5 text-sm text-primary font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <CircleNotch size={16} weight="bold" className="animate-spin" />
            ) : (
              <Sparkle size={16} weight="duotone" />
            )}
            {generating ? '搜索中…' : '搜索封面'}
          </button>
        </div>
      </div>

      <div className="relative aspect-video max-h-52 rounded-2xl overflow-hidden bg-surface">
        {coverImage ? (
          <img
            src={coverImage}
            alt={recipeName || '封面预览'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary/60 gap-2">
            <Image size={40} weight="duotone" />
            <span className="text-sm">填写菜名后搜索封面，或直接选择图片</span>
          </div>
        )}
        {generating && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center px-4">
            <div className="text-white text-sm text-center flex flex-col items-center gap-2">
              <CircleNotch size={20} weight="bold" className="animate-spin" />
              <span>{progressMsg || '正在搜索…'}</span>
              <span className="text-xs text-white/70">
                {isTauri() ? '百度图片搜索（国内网络）' : '请使用桌面应用以搜索真实图片'}
              </span>
            </div>
          </div>
        )}
      </div>

      {genError && <p className="text-sm text-red-600">{genError}</p>}

      <input
        value={coverImage.startsWith('data:') ? '' : coverImage}
        onChange={(e) => onCoverImageChange(e.target.value)}
        className="input-field !bg-surface"
        placeholder="或手动粘贴图片 URL"
      />

      <p className="text-xs text-text-secondary/70">
        {isTauri()
          ? '内置菜名优先使用已下载封面；新菜名会通过百度图片搜索（桌面/Android 应用均可用）。也可点击「选择图片」。'
          : '手机浏览器无法搜索封面，请安装 Android 应用，或使用「选择图片」。'}
      </p>
    </div>
  );
}
