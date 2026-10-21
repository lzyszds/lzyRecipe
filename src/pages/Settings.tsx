import { ArrowSquareOut, Trash } from '@phosphor-icons/react';
import { PageHeader } from '../components/ui/PageHeader';
import { PageMain } from '../components/ui/PageLayout';
import { APP_NAME } from '../lib/appBrand';
import { useFavoritesStore } from '../store/favoritesStore';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import {
  useSettingsStore,
  CoverProvider,
  isCloudCoverConfigured,
} from '../store/settingsStore';

const PROVIDER_OPTIONS: { value: CoverProvider; label: string; desc: string }[] = [
  { value: 'local', label: '本地封面', desc: '完全离线，自动生成柔和渐变封面' },
  { value: 'baidu', label: '百度文心生图（高级）', desc: 'AI 生成，需 API Key + Secret Key' },
  { value: 'bing', label: '微软 Bing 图片搜索（高级）', desc: '需 Azure / Bing 密钥' },
];

export function Settings() {
  const clearFavorites = () => useFavoritesStore.setState({ favorites: [] });
  const clearImported = useImportedRecipesStore((s) => s.clearImportedRecipes);

  const {
    coverProvider,
    baiduApiKey,
    baiduSecretKey,
    bingApiKey,
    bingEndpoint,
    setCoverProvider,
    setBaiduKeys,
    setBingKey,
    setBingEndpoint,
  } = useSettingsStore();

  const cloudReady = isCloudCoverConfigured(useSettingsStore.getState());

  const handleClearAll = () => {
    if (
      confirm(
        '确定要清空所有收藏和导入的菜谱吗？内置菜谱不会被删除，此操作不可恢复。'
      )
    ) {
      clearFavorites();
      clearImported();
    }
  };

  return (
    <div className="pb-10">
      <PageHeader title="设置" showBack />

      <PageMain className="space-y-4">
        <section className="bg-white rounded-xl p-5 shadow-card space-y-4">
          <div>
            <h2 className="text-sm font-bold text-text-primary">封面生成</h2>
            <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
              默认优先使用百度图片搜索（免配置）。下方为可选的高级云服务。
            </p>
          </div>

          <div className="space-y-2">
            {PROVIDER_OPTIONS.map((opt) => {
              const active = coverProvider === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all ${
                    active
                      ? 'bg-sage-50 ring-1 ring-primary/25'
                      : 'bg-surface hover:bg-oat-100/80'
                  }`}
                >
                  <input
                    type="radio"
                    name="coverProvider"
                    value={opt.value}
                    checked={active}
                    onChange={() => setCoverProvider(opt.value)}
                    className="mt-0.5 accent-[#E58A54]"
                  />
                  <div>
                    <p className="text-xs font-medium text-text-primary">{opt.label}</p>
                    <p className="text-[11px] text-text-secondary mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {coverProvider === 'baidu' && (
            <div className="space-y-3 pt-3 border-t border-oat-100">
              <p className="text-[11px] text-text-secondary leading-relaxed">
                在
                <a
                  href="https://cloud.baidu.com/product/wenxinworkshop"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-0.5 mx-1"
                >
                  百度智能云 · 文心 workshop
                  <ArrowSquareOut size={11} weight="bold" />
                </a>
                创建应用，开通「AI作画-基础版」。
              </p>
              <input
                value={baiduApiKey}
                onChange={(e) => setBaiduKeys(e.target.value, baiduSecretKey)}
                className="input-field !bg-surface"
                placeholder="百度 API Key"
              />
              <input
                type="password"
                value={baiduSecretKey}
                onChange={(e) => setBaiduKeys(baiduApiKey, e.target.value)}
                className="input-field !bg-surface"
                placeholder="百度 Secret Key"
              />
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg leading-relaxed">
                百度文心生图仅支持桌面应用，请使用 npm run tauri:dev 运行。
              </p>
            </div>
          )}

          {coverProvider === 'bing' && (
            <div className="space-y-3 pt-3 border-t border-oat-100">
              <p className="text-[11px] text-text-secondary leading-relaxed">
                在
                <a
                  href="https://portal.azure.cn/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-0.5 mx-1"
                >
                  Azure 中国
                  <ArrowSquareOut size={11} weight="bold" />
                </a>
                或 Azure 国际版创建「Bing Search v7」资源。
              </p>
              <input
                type="password"
                value={bingApiKey}
                onChange={(e) => setBingKey(e.target.value)}
                className="input-field !bg-surface"
                placeholder="Bing / Azure 订阅密钥"
              />
              <input
                value={bingEndpoint}
                onChange={(e) => setBingEndpoint(e.target.value)}
                className="input-field !bg-surface text-xs"
                placeholder="搜索端点 URL"
              />
              <p className="text-[11px] text-text-secondary leading-relaxed">
                默认端点适用于国际版 Azure，Azure 中国请填写中国区端点。
              </p>
            </div>
          )}

          {cloudReady && (
            <p className="text-[11px] text-sage-600 bg-sage-50 p-2.5 rounded-lg">
              云服务已配置，写菜谱时点击「搜索封面」即可使用。
            </p>
          )}
        </section>

        <section className="bg-white rounded-xl p-5 shadow-card space-y-1.5">
          <h2 className="text-sm font-bold text-text-primary mb-2">关于</h2>
          <p className="text-xs text-text-secondary">应用名称：{APP_NAME}</p>
          <p className="text-xs text-text-secondary">版本：{__APP_VERSION__}</p>
          <p className="text-xs text-text-secondary leading-relaxed">
            API 密钥仅保存在本地，不会上传到任何服务器。
          </p>
        </section>

        <section className="bg-white rounded-xl overflow-hidden shadow-card">
          <button
            type="button"
            onClick={handleClearAll}
            className="w-full flex items-center gap-3 px-4 min-h-[3.5rem] text-red-500 hover:bg-red-50/60 transition-colors text-sm font-medium"
          >
            <Trash size={18} weight="bold" />
            <span>清空收藏与导入数据</span>
          </button>
        </section>
      </PageMain>
    </div>
  );
}
