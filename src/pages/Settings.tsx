import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, ExternalLink } from 'lucide-react';
import { useFavoritesStore } from '../store/favoritesStore';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import {
  useSettingsStore,
  CoverProvider,
  isCloudCoverConfigured,
} from '../store/settingsStore';

const PROVIDER_OPTIONS: { value: CoverProvider; label: string; desc: string }[] = [
  { value: 'local', label: '本地封面', desc: '完全离线，Canvas 渐变封面' },
  { value: 'baidu', label: '百度文心生图（高级）', desc: 'AI 生成，需 API Key + Secret Key' },
  { value: 'bing', label: '微软 Bing 图片搜索（高级）', desc: '需 Azure/Bing 密钥' },
];

export function Settings() {
  const navigate = useNavigate();
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
          <h1 className="font-serif text-xl font-semibold text-text-primary">设置</h1>
        </div>
      </div>

      <main className="px-4 py-6 space-y-6">
        <section className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-4 border-b border-surface/30">
            <h2 className="font-medium text-text-primary">封面生成</h2>
            <p className="text-xs text-text-secondary mt-1">
              默认使用百度图片搜索（免配置）。下方为可选的高级云服务。
            </p>
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-2">
              {PROVIDER_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    coverProvider === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-surface hover:bg-surface/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="coverProvider"
                    value={opt.value}
                    checked={coverProvider === opt.value}
                    onChange={() => setCoverProvider(opt.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-text-primary text-sm">{opt.label}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {coverProvider === 'baidu' && (
              <div className="space-y-3 pt-2 border-t border-surface/30">
                <p className="text-xs text-text-secondary">
                  在
                  <a
                    href="https://cloud.baidu.com/product/wenxinworkshop"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-flex items-center gap-0.5 mx-1"
                  >
                    百度智能云 · 文心 workshop
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  创建应用，开通「AI作画-基础版」，获取 API Key 与 Secret Key。
                </p>
                <input
                  value={baiduApiKey}
                  onChange={(e) => setBaiduKeys(e.target.value, baiduSecretKey)}
                  className="input-field"
                  placeholder="百度 API Key"
                />
                <input
                  type="password"
                  value={baiduSecretKey}
                  onChange={(e) => setBaiduKeys(baiduApiKey, e.target.value)}
                  className="input-field"
                  placeholder="百度 Secret Key"
                />
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                  百度文心生图请使用桌面应用：<code className="text-xs">npm run tauri:dev</code>
                </p>
              </div>
            )}

            {coverProvider === 'bing' && (
              <div className="space-y-3 pt-2 border-t border-surface/30">
                <p className="text-xs text-text-secondary">
                  在
                  <a
                    href="https://portal.azure.cn/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-flex items-center gap-0.5 mx-1"
                  >
                    Azure 中国
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  或 Azure 国际版创建「Bing Search v7」资源，复制密钥。
                </p>
                <input
                  type="password"
                  value={bingApiKey}
                  onChange={(e) => setBingKey(e.target.value)}
                  className="input-field"
                  placeholder="Bing / Azure 订阅密钥"
                />
                <input
                  value={bingEndpoint}
                  onChange={(e) => setBingEndpoint(e.target.value)}
                  className="input-field text-sm"
                  placeholder="搜索端点 URL"
                />
                <p className="text-xs text-text-secondary">
                  默认端点适用于国际版 Azure。Azure 中国请填写控制台中的中国区端点。
                </p>
              </div>
            )}

            {cloudReady && (
              <p className="text-xs text-green-700 bg-green-50 p-2 rounded-lg">
                云服务已配置，写菜谱时点击「生成封面」即可使用。
              </p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-4 border-b border-surface/30">
            <h2 className="font-medium text-text-primary">关于</h2>
          </div>
          <div className="px-4 py-4 space-y-2 text-sm text-text-secondary">
            <p>应用名称：珍藏阁 · 菜谱</p>
            <p>版本：0.1.0</p>
            <p>API 密钥仅保存在本地，不会上传到我们的服务器。</p>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-4 border-b border-surface/30">
            <h2 className="font-medium text-text-primary">数据管理</h2>
          </div>
          <button
            onClick={handleClearAll}
            className="w-full flex items-center gap-3 px-4 py-4 text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            <span>清空收藏与导入数据</span>
          </button>
        </section>
      </main>
    </div>
  );
}
