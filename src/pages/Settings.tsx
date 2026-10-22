import { useState } from 'react';
import {
  ArrowSquareOut,
  ArrowsClockwise,
  Check,
  CloudArrowUp,
  CircleNotch,
  Trash,
  Warning,
} from '@phosphor-icons/react';
import { PageHeader } from '../components/ui/PageHeader';
import { PageMain } from '../components/ui/PageLayout';
import { APP_NAME } from '../lib/appBrand';
import { useFavoritesStore } from '../store/favoritesStore';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import {
  useSettingsStore,
  CoverProvider,
  isCloudCoverConfigured,
  isSyncConfigured,
  isAiConfigured,
} from '../store/settingsStore';
import {
  pullFromCloud,
  pushToCloud,
  testConnection,
  useSyncStore,
  syncNow,
} from '../lib/cloudSync';
import { chatWithAi, AiError } from '../lib/ai';
import { UpdateDialog } from '../components/UpdateDialog';
import { checkForUpdate, type UpdateInfo } from '../lib/updater';

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

  const { sync, ai, setSync, setAi } = useSettingsStore();
  const syncStore = useSyncStore();
  const syncReady = isSyncConfigured(sync);
  const aiReady = isAiConfigured(ai);

  const [syncBusy, setSyncBusy] = useState<'test' | 'pull' | 'push' | 'sync' | null>(null);
  const [syncMsg, setSyncMsg] = useState('');
  const [syncError, setSyncError] = useState('');

  const runSyncAction = async (kind: 'test' | 'pull' | 'push' | 'sync') => {
    setSyncBusy(kind);
    setSyncMsg('');
    setSyncError('');
    try {
      if (kind === 'test') {
        const ok = await testConnection(sync);
        setSyncMsg(ok ? '连接正常，可以开始同步' : '连接异常，请检查地址');
      } else if (kind === 'pull') {
        await pullFromCloud(sync);
        setSyncMsg('已从云端拉取到本机');
      } else if (kind === 'push') {
        await pushToCloud(sync);
        setSyncMsg('已把本机数据上传到云端');
      } else {
        const ok = await syncNow(sync);
        if (!ok) throw new Error(useSyncStore.getState().message);
        setSyncMsg('同步完成');
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncBusy(null);
    }
  };

  // 检查更新
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  const handleCheckUpdate = async () => {
    setUpdateBusy(true);
    setUpdateMsg('');
    try {
      const info = await checkForUpdate();
      if (info) setUpdateInfo(info);
      else setUpdateMsg(`已是最新版本 v${__APP_VERSION__}`);
    } catch (err) {
      setUpdateMsg(`检查失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpdateBusy(false);
    }
  };

  const [aiTesting, setAiTesting] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [aiError, setAiError] = useState('');

  const handleTestAi = async () => {
    setAiTesting(true);
    setAiMsg('');
    setAiError('');
    try {
      const reply = await chatWithAi(
        { baseUrl: ai.baseUrl, apiKey: ai.apiKey, model: ai.model },
        [
          { role: 'system', content: '你是测试助手，只回复两个字：可用' },
          { role: 'user', content: '你好' },
        ],
        { temperature: 0 }
      );
      setAiMsg(`连接成功，模型回复：${reply.slice(0, 40)}`);
    } catch (err) {
      setAiError(
        err instanceof AiError || err instanceof Error ? err.message : String(err)
      );
    } finally {
      setAiTesting(false);
    }
  };

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

        <section className="bg-white rounded-xl p-5 shadow-card space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-text-primary">云同步</h2>
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                同步导入的菜谱、收藏、三餐周历、笔记和 AI 配置。服务端为自己部署的 Cloudflare Worker（KV 版），填入 Worker 地址和同步密钥即可。
              </p>
            </div>
            <span
              className={
                syncReady
                  ? 'shrink-0 flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-sage-50 text-sage-600'
                  : 'shrink-0 flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface text-text-secondary'
              }
            >
              <CloudArrowUp size={12} weight="bold" />
              {syncReady ? '已配置' : '未配置'}
            </span>
          </div>

          <div>
            <label className="form-label">同步地址</label>
            <input
              value={sync.endpoint}
              onChange={(e) => setSync({ endpoint: e.target.value.trim() })}
              className="input-field !bg-surface"
              placeholder="https://mengchu-sync.xxx.workers.dev"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="form-label">同步密钥</label>
            <input
              type="password"
              value={sync.token}
              onChange={(e) => setSync({ token: e.target.value })}
              className="input-field !bg-surface"
              placeholder="至少 8 位，换设备时填同一个"
              autoComplete="off"
            />
          </div>

          <label className="flex items-center justify-between gap-3 px-1">
            <span className="text-xs text-text-primary">打开 App 时自动同步</span>
            <input
              type="checkbox"
              checked={sync.autoSync}
              onChange={(e) => setSync({ autoSync: e.target.checked })}
              className="w-4 h-4 accent-[#E58A54]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runSyncAction('test')}
              disabled={!syncReady || syncBusy !== null}
              className="btn btn-secondary btn-sm"
            >
              {syncBusy === 'test' ? (
                <CircleNotch size={13} weight="bold" className="animate-spin" />
              ) : (
                <Check size={13} weight="bold" />
              )}
              测试连接
            </button>
            <button
              type="button"
              onClick={() => void runSyncAction('sync')}
              disabled={!syncReady || syncBusy !== null}
              className="btn btn-primary btn-sm"
            >
              {syncBusy === 'sync' ? (
                <CircleNotch size={13} weight="bold" className="animate-spin" />
              ) : (
                <ArrowsClockwise size={13} weight="bold" />
              )}
              立即同步
            </button>
          </div>

          <div className="flex gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => void runSyncAction('pull')}
              disabled={!syncReady || syncBusy !== null}
              className="flex-1 py-2 rounded-lg bg-surface text-text-primary font-medium disabled:opacity-50"
            >
              从云端拉取
            </button>
            <button
              type="button"
              onClick={() => void runSyncAction('push')}
              disabled={!syncReady || syncBusy !== null}
              className="flex-1 py-2 rounded-lg bg-surface text-text-primary font-medium disabled:opacity-50"
            >
              本机覆盖云端
            </button>
          </div>

          {(syncMsg || syncError || syncStore.lastSyncedAt) && (
            <p
              className={
                syncError
                  ? 'text-[11px] leading-relaxed rounded-lg p-2.5 text-red-500 bg-red-50'
                  : 'text-[11px] leading-relaxed rounded-lg p-2.5 text-sage-600 bg-sage-50'
              }
            >
              {syncError ||
                syncMsg ||
                `上次同步：${new Date(syncStore.lastSyncedAt ?? '').toLocaleString('zh-CN')}`}
            </p>
          )}
        </section>

        <section className="bg-white rounded-xl p-5 shadow-card space-y-3">
          <div>
            <h2 className="text-sm font-bold text-text-primary">AI 助手</h2>
            <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
              支持任何 OpenAI 兼容接口（DeepSeek、通义、豆包、OpenAI、中转站等）。用于写菜谱、详情页问答和语音转文字。
            </p>
          </div>

          <div>
            <label className="form-label">接口地址</label>
            <input
              value={ai.baseUrl}
              onChange={(e) => setAi({ baseUrl: e.target.value.trim() })}
              className="input-field !bg-surface"
              placeholder="https://api.deepseek.com/v1"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="form-label">API Key</label>
            <input
              type="password"
              value={ai.apiKey}
              onChange={(e) => setAi({ apiKey: e.target.value.trim() })}
              className="input-field !bg-surface"
              placeholder="sk-..."
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="form-label">对话模型</label>
              <input
                value={ai.model}
                onChange={(e) => setAi({ model: e.target.value.trim() })}
                className="input-field !bg-surface"
                placeholder="deepseek-chat"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="form-label">语音转文字模型</label>
              <input
                value={ai.transcribeModel}
                onChange={(e) => setAi({ transcribeModel: e.target.value.trim() })}
                className="input-field !bg-surface"
                placeholder="whisper-1"
                autoComplete="off"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleTestAi()}
            disabled={!aiReady || aiTesting}
            className="btn btn-secondary btn-sm w-full"
          >
            {aiTesting ? (
              <CircleNotch size={13} weight="bold" className="animate-spin" />
            ) : (
              <Check size={13} weight="bold" />
            )}
            {aiTesting ? '正在测试…' : '测试 AI 连接'}
          </button>

          {aiMsg && (
            <p className="text-[11px] text-sage-600 bg-sage-50 p-2.5 rounded-lg leading-relaxed">
              {aiMsg}
            </p>
          )}
          {aiError && (
            <p className="flex items-start gap-1.5 text-[11px] text-red-500 bg-red-50 p-2.5 rounded-lg leading-relaxed">
              <Warning size={13} weight="bold" className="mt-0.5 shrink-0" />
              <span className="break-all">{aiError}</span>
            </p>
          )}
        </section>

        <section className="bg-white rounded-xl p-5 shadow-card space-y-1.5">
          <h2 className="text-sm font-bold text-text-primary mb-2">关于</h2>
          <p className="text-xs text-text-secondary">应用名称：{APP_NAME}</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-text-secondary">版本：{__APP_VERSION__}</p>
            <button
              type="button"
              onClick={() => void handleCheckUpdate()}
              disabled={updateBusy}
              className="flex items-center gap-1 text-[11px] font-medium text-primary disabled:opacity-50"
            >
              {updateBusy ? (
                <CircleNotch size={12} weight="bold" className="animate-spin" />
              ) : (
                <ArrowsClockwise size={12} weight="bold" />
              )}
              检查更新
            </button>
          </div>
          {updateMsg && (
            <p className="text-[11px] text-text-secondary bg-surface rounded-lg p-2.5 leading-relaxed">
              {updateMsg}
            </p>
          )}
          <p className="text-xs text-text-secondary leading-relaxed">
            开启云同步后，AI 配置会随其它数据一起保存到你自己的 Cloudflare 服务端。
          </p>
        </section>

        <UpdateDialog info={updateInfo} onClose={() => setUpdateInfo(null)} />

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
