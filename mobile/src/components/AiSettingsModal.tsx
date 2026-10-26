import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModal } from './BottomSheetModal';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Server,
  KeyRound,
  Bot,
  Cloud,
  CloudOff,
  CloudDownload,
  ChevronLeft,
  RefreshCw,
  Search,
  Check,
  Cpu,
} from 'lucide-react-native';
import {
  useSettingsStore,
  isAiConfigured,
  isSyncConfigured,
  AiSettings,
} from '@/store/settingsStore';
import {
  testAiConnection,
  fetchRemoteModels,
  RemoteModelInfo,
} from '@/lib/ai';
import { pushToCloud } from '@/lib/cloudSync';
import { toast } from '@/store/feedbackStore';
import { ensureAiIdle, runAiTask } from '@/store/aiTaskStore';
import { logActivity } from '@/store/activityLogStore';
import { Palette } from '@/constants/theme';
import { AI_CHANNELS } from '@/constants/aiChannels';

interface AiSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESETS = AI_CHANNELS;

type FilterType = 'all' | 'free' | 'large' | 'light' | 'vision';

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const { ai, setAi, sync } = useSettingsStore();
  const syncConfigured = isSyncConfigured(sync);

  const getPresetId = (url: string) => {
    if (url.includes('integrate.api.nvidia.com')) return 'nvidia';
    if (url.includes('siliconflow.cn')) return 'siliconflow';
    if (url.includes('deepseek.com')) return 'deepseek';
    return 'custom';
  };

  const [channelKeys, setChannelKeys] = useState<Record<string, string>>({
    nvidia: '',
    siliconflow: '',
    deepseek: '',
    custom: '',
  });

  const [channelModels, setChannelModels] = useState<Record<string, string>>({
    nvidia: 'minimaxai/minimax-m3.1-flash',
    siliconflow: 'deepseek-ai/DeepSeek-V3.2',
    deepseek: 'deepseek-flash',
    custom: '',
  });

  const [channelBaseUrls, setChannelBaseUrls] = useState<Record<string, string>>({
    nvidia: 'https://integrate.api.nvidia.com/v1',
    siliconflow: 'https://api.siliconflow.cn/v1',
    deepseek: 'https://api.deepseek.com/v1',
    custom: '',
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string>('nvidia');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    msg: string;
  } | null>(null);

  // 模型拉取与选择视图状态
  const [viewMode, setViewMode] = useState<'form' | 'picker'>('form');
  const [remoteModels, setRemoteModels] = useState<RemoteModelInfo[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (visible) {
      const currentAi = useSettingsStore.getState().ai;
      const activeProvider = currentAi.providerId || getPresetId(currentAi.baseUrl || '');
      setSelectedPresetId(activeProvider);

      const keys: Record<string, string> = {
        nvidia: '',
        siliconflow: '',
        deepseek: '',
        custom: '',
        ...(currentAi.channelKeys || {}),
      };
      if (currentAi.apiKey && !keys[activeProvider]) {
        keys[activeProvider] = currentAi.apiKey;
      }
      setChannelKeys(keys);

      const models: Record<string, string> = {
        nvidia: 'minimaxai/minimax-m3.1-flash',
        siliconflow: 'deepseek-ai/DeepSeek-V3.2',
        deepseek: 'deepseek-flash',
        custom: '',
        ...(currentAi.channelModels || {}),
      };
      if (currentAi.model && !models[activeProvider]) {
        models[activeProvider] = currentAi.model;
      }
      setChannelModels(models);

      const baseUrls: Record<string, string> = {
        nvidia: 'https://integrate.api.nvidia.com/v1',
        siliconflow: 'https://api.siliconflow.cn/v1',
        deepseek: 'https://api.deepseek.com/v1',
        custom: '',
        ...(currentAi.channelBaseUrls || {}),
      };
      if (currentAi.baseUrl && !baseUrls[activeProvider]) {
        baseUrls[activeProvider] = currentAi.baseUrl;
      }
      setChannelBaseUrls(baseUrls);

      const preset = PRESETS.find((p) => p.id === activeProvider) || PRESETS[0];
      setBaseUrl(activeProvider === 'custom' ? (baseUrls.custom || '') : preset.baseUrl);
      setApiKey(keys[activeProvider] || '');
      setModel(models[activeProvider] || preset.model);

      setTestResult(null);
      setViewMode('form');
      setSearchQuery('');
      setSelectedFilter('all');
    }
  }, [visible]);

  const handleApplyPreset = (preset: (typeof PRESETS)[0]) => {
    const nextId = preset.id;
    setSelectedPresetId(nextId);

    const nextUrl = nextId === 'custom' ? (channelBaseUrls.custom || '') : preset.baseUrl;
    const nextKey = channelKeys[nextId] || '';
    const nextModel = channelModels[nextId] || preset.model;

    setBaseUrl(nextUrl);
    setApiKey(nextKey);
    setModel(nextModel);

    setRemoteModels([]);
    setTestResult(null);
    toast({ type: 'info', message: `已切换至 ${preset.name}（独立 Key 模式）` });
  };

  const handleApiKeyChange = (text: string) => {
    setApiKey(text);
    setChannelKeys((prev) => ({
      ...prev,
      [selectedPresetId]: text,
    }));
  };

  const handleBaseUrlChange = (text: string) => {
    setBaseUrl(text);
    if (selectedPresetId === 'custom') {
      setChannelBaseUrls((prev) => ({
        ...prev,
        custom: text,
      }));
    }
  };

  const handleModelChange = (text: string) => {
    setModel(text);
    setChannelModels((prev) => ({
      ...prev,
      [selectedPresetId]: text,
    }));
  };

  const handleSave = async () => {
    const currentPreset = PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];
    const finalBaseUrl =
      selectedPresetId === 'custom'
        ? baseUrl.trim()
        : baseUrl.trim() || currentPreset.baseUrl;
    const finalApiKey = apiKey.trim();
    const finalModel = model.trim() || currentPreset.model;

    const updatedChannelKeys = {
      ...channelKeys,
      [selectedPresetId]: finalApiKey,
    };
    const updatedChannelModels = {
      ...channelModels,
      [selectedPresetId]: finalModel,
    };
    const updatedChannelBaseUrls = {
      ...channelBaseUrls,
      [selectedPresetId]: finalBaseUrl,
    };

    setAi({
      providerId: selectedPresetId,
      baseUrl: finalBaseUrl,
      apiKey: finalApiKey,
      model: finalModel,
      channelKeys: updatedChannelKeys,
      channelModels: updatedChannelModels,
      channelBaseUrls: updatedChannelBaseUrls,
    });

    if (syncConfigured) {
      try {
        await pushToCloud();
        toast({ type: 'success', message: '所有渠道独立配置已保存并同步至云端' });
      } catch (err: any) {
        toast({ type: 'warning', message: '已保存至本地（云端同步失败，请检查网络）' });
      }
    } else {
      toast({ type: 'success', message: '所有渠道独立配置已保存' });
    }
    onClose();
  };

  const handleSyncKeyToCloud = async () => {
    if (!syncConfigured) {
      toast({ type: 'warning', message: '请先在「设置 - 云同步」中配置私人密钥' });
      return;
    }
    const currentPreset = PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];
    const finalBaseUrl =
      selectedPresetId === 'custom'
        ? baseUrl.trim()
        : baseUrl.trim() || currentPreset.baseUrl;
    const finalApiKey = apiKey.trim();
    const finalModel = model.trim() || currentPreset.model;

    const updatedChannelKeys = {
      ...channelKeys,
      [selectedPresetId]: finalApiKey,
    };
    const updatedChannelModels = {
      ...channelModels,
      [selectedPresetId]: finalModel,
    };
    const updatedChannelBaseUrls = {
      ...channelBaseUrls,
      [selectedPresetId]: finalBaseUrl,
    };

    setAi({
      providerId: selectedPresetId,
      baseUrl: finalBaseUrl,
      apiKey: finalApiKey,
      model: finalModel,
      channelKeys: updatedChannelKeys,
      channelModels: updatedChannelModels,
      channelBaseUrls: updatedChannelBaseUrls,
    });

    setSyncingCloud(true);
    try {
      await pushToCloud();
      toast({ type: 'success', message: '各渠道独立配置已上传至云端' });
    } catch (err: any) {
      toast({ type: 'error', message: err.message || '上传云端失败，请检查网络' });
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleTest = async () => {
    const tempConfig: AiSettings = {
      providerId: selectedPresetId,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
    };

    if (!isAiConfigured(tempConfig)) {
      setTestResult({
        ok: false,
        msg: '请先填写完整的 API 地址、API Key 和模型名称',
      });
      return;
    }

    // 有其他 AI 任务在跑时，拦截并提示
    if (!ensureAiIdle()) return;

    setTesting(true);
    setTestResult(null);
    try {
      const res = await runAiTask('AI 连接测试', () => testAiConnection(tempConfig));
      setTestResult({
        ok: true,
        latencyMs: res.latencyMs,
        msg: `连接成功 (耗时 ${res.latencyMs}ms)\nAI 回复:「${res.reply}」`,
      });
      toast({ type: 'success', message: `连接成功 (耗时 ${res.latencyMs}ms)` });
      logActivity({
        type: 'ai',
        action: 'AI 连接测试',
        detail: `连接成功（${res.latencyMs}ms）`,
        meta: { 渠道: tempConfig.providerId || '—', 模型: tempConfig.model || '—' },
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        msg: err.message || '连接失败，请检查网络或密钥配置',
      });
      toast({ type: 'error', message: err.message || '连接失败，请检查网络或配置' });
    } finally {
      setTesting(false);
    }
  };

  const loadModels = async (forceRefresh = false) => {
    const targetUrl = baseUrl.trim();
    if (!targetUrl) {
      toast({ type: 'warning', message: '请先输入接口地址 (Base URL)' });
      return;
    }

    if (remoteModels.length > 0 && !forceRefresh) {
      setViewMode('picker');
      return;
    }

    setFetchingModels(true);
    try {
      const list = await fetchRemoteModels(targetUrl, apiKey.trim());
      setRemoteModels(list);
      setViewMode('picker');
      toast({ type: 'success', message: `成功拉取到 ${list.length} 个可用模型` });
    } catch (err: any) {
      toast({ type: 'error', message: err.message || '拉取模型失败，请检查地址或网络' });
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSelectModel = (selectedId: string) => {
    setModel(selectedId);
    setChannelModels((prev) => ({
      ...prev,
      [selectedPresetId]: selectedId,
    }));
    setViewMode('form');
    toast({ type: 'success', message: `已选用模型: ${selectedId}` });
  };

  // 过滤模型列表
  const filteredModels = useMemo(() => {
    let result = remoteModels;
    if (selectedFilter === 'free') {
      result = result.filter((m) => Boolean(m.freeBadge));
    } else if (selectedFilter === 'large') {
      result = result.filter(
        (m) =>
          m.sizeBadge.includes('70B') ||
          m.sizeBadge.includes('340B') ||
          m.sizeBadge.includes('8X22B') ||
          m.sizeBadge.includes('旗舰')
      );
    } else if (selectedFilter === 'light') {
      result = result.filter(
        (m) =>
          m.sizeBadge.includes('8B') ||
          m.sizeBadge.includes('12B') ||
          m.sizeBadge.includes('14B') ||
          m.sizeBadge.includes('轻量')
      );
    } else if (selectedFilter === 'vision') {
      result = result.filter(
        (m) => m.typeBadge.includes('视觉') || m.typeBadge.includes('多模态')
      );
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          (m.ownedBy && m.ownedBy.toLowerCase().includes(q)) ||
          m.vendorBadge.toLowerCase().includes(q) ||
          m.sizeBadge.toLowerCase().includes(q)
      );
    }
    return result;
  }, [remoteModels, selectedFilter, searchQuery]);

  const currentPreset = PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      sheetStyle={styles.sheet}
    >
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        {viewMode === 'form' ? (
          <>
            {/* 顶部标题栏：清晰规范的左右布局 */}
            <View style={styles.formHeader}>
              <View style={styles.formHeaderLeft}>
                <View style={styles.iconBadge}>
                  <Sparkles size={18} color="#FFFFFF" />
                </View>
                <View style={styles.titleTextWrap}>
                  <Text style={styles.sheetTitle}>AI 助手配置</Text>
                  <Text style={styles.sheetSubtitle} numberOfLines={1}>
                    多渠道独立 Key · 支持 NVIDIA/硅基/DeepSeek/自定义
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <X size={18} color={Palette.inkMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 常用服务商快捷预设 */}
              <View style={styles.presetSection}>
                <View style={styles.labelRowBetween}>
                  <Text style={styles.fieldLabel}>常用渠道商：</Text>
                  <Text style={styles.channelTip}>每个渠道独立配置 Key</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.presetsRow}
                >
                  {PRESETS.map((p) => {
                    const isSelected = selectedPresetId === p.id;
                    const hasKey = Boolean(channelKeys[p.id]?.trim());
                    const Icon = p.icon;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.presetChip,
                          !isSelected && styles.presetChipIconOnly,
                          isSelected && styles.presetChipActive,
                        ]}
                        onPress={() => handleApplyPreset(p)}
                        activeOpacity={0.75}
                      >
                        <Icon size={isSelected ? 14 : 17} color={isSelected ? Palette.primary : p.iconColor} />
                        {isSelected && (
                          <Text style={[styles.presetChipText, styles.presetChipTextActive]} numberOfLines={1}>
                            {p.name}
                          </Text>
                        )}
                        {hasKey && (
                          <View
                            style={[
                              styles.keyBadgeDot,
                              !isSelected && styles.keyBadgeDotSolo,
                              isSelected && styles.keyBadgeDotActive,
                            ]}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 字段 1：接口地址 */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Server size={14} color={Palette.cocoa[700]} />
                  <Text style={styles.fieldLabel}>接口地址 (Base URL)</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder={currentPreset.baseUrl || 'https://api.openai.com/v1'}
                  placeholderTextColor={Palette.cocoa[400]}
                  value={baseUrl}
                  onChangeText={handleBaseUrlChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.inputHint}>
                  {selectedPresetId === 'custom'
                    ? '自定义接口：支持任何遵循 OpenAI /chat/completions 规范的 API 接口'
                    : currentPreset.desc}
                </Text>
              </View>

              {/* 字段 2：API Key 与云端存储状态 */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRowBetween}>
                  <View style={styles.labelRow}>
                    <KeyRound size={14} color={Palette.cocoa[700]} />
                    <Text style={styles.fieldLabel}>API Key (令牌密钥)</Text>
                  </View>
                  <View style={styles.channelBadgeWrap}>
                    <Text style={styles.channelBadgeText}>
                      {currentPreset.name} 专属 Key
                    </Text>
                  </View>
                </View>
                <View style={styles.keyInputWrapper}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, paddingRight: 40 }]}
                    placeholder={currentPreset.placeholderKey || '请输入当前渠道的专属 API Key'}
                    placeholderTextColor={Palette.cocoa[400]}
                    value={apiKey}
                    onChangeText={handleApiKeyChange}
                    secureTextEntry={!showKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowKey(!showKey)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {showKey ? (
                      <EyeOff size={16} color={Palette.cocoa[400]} />
                    ) : (
                      <Eye size={16} color={Palette.cocoa[400]} />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.inputHint}>
                  每个渠道独立保存 API Key，切换渠道自动同步专属密钥，互不影响与覆盖
                </Text>

                {/* 云端存储提示与手动上传 */}
                <View
                  style={[
                    styles.cloudCard,
                    syncConfigured ? styles.cloudCardReady : styles.cloudCardWarn,
                  ]}
                >
                  <View style={styles.cloudCardLeft}>
                    {syncConfigured ? (
                      <Cloud size={15} color="#059669" />
                    ) : (
                      <CloudOff size={15} color={Palette.cocoa[400]} />
                    )}
                    <Text
                      style={[
                        styles.cloudCardText,
                        { color: syncConfigured ? '#065F46' : Palette.cocoa[700] },
                      ]}
                    >
                      {syncConfigured
                        ? '云端同步已绑定：保存时所有渠道独立 Key 将加密同步至云服务器'
                        : '未开启云端同步：各渠道 Key 仅保存在本机，配置「云同步」可多端共享'}
                    </Text>
                  </View>
                  {syncConfigured && (
                    <TouchableOpacity
                      style={styles.cloudSyncBtn}
                      onPress={handleSyncKeyToCloud}
                      disabled={syncingCloud}
                      activeOpacity={0.7}
                    >
                      {syncingCloud ? (
                        <ActivityIndicator size="small" color="#059669" />
                      ) : (
                        <Text style={styles.cloudSyncBtnText}>立即备份</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* 字段 3：模型名称与自动拉取按钮 */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRowBetween}>
                  <View style={styles.labelRow}>
                    <Bot size={14} color={Palette.cocoa[700]} />
                    <Text style={styles.fieldLabel}>模型名称 (Model)</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.fetchModelBtn}
                    onPress={() => loadModels(false)}
                    disabled={fetchingModels}
                    activeOpacity={0.75}
                  >
                    {fetchingModels ? (
                      <ActivityIndicator size="small" color={Palette.primary} />
                    ) : (
                      <>
                        <CloudDownload size={13} color={Palette.primary} />
                        <Text style={styles.fetchModelBtnText}>
                          {remoteModels.length > 0
                            ? `选择模型 (${remoteModels.length})`
                            : '自动拉取模型'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder={currentPreset.model || '输入当前渠道生效的模型名称'}
                  placeholderTextColor={Palette.cocoa[400]}
                  value={model}
                  onChangeText={handleModelChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.inputHint}>
                  点击右上角「自动拉取模型」可根据当前渠道与 Key 实时拉取所有可用模型
                </Text>
              </View>

              {/* 测试状态反馈 */}
              {testResult && (
                <View
                  style={[
                    styles.resultCard,
                    testResult.ok ? styles.resultSuccess : styles.resultError,
                  ]}
                >
                  <View style={styles.resultHeader}>
                    {testResult.ok ? (
                      <CheckCircle2 size={16} color="#059669" />
                    ) : (
                      <AlertCircle size={16} color="#DC2626" />
                    )}
                    <Text
                      style={[
                        styles.resultTitle,
                        { color: testResult.ok ? '#059669' : '#DC2626' },
                      ]}
                    >
                      {testResult.ok ? '连接测试成功' : '连接测试失败'}
                    </Text>
                  </View>
                  <Text style={styles.resultMsg}>{testResult.msg}</Text>
                </View>
              )}

              {/* 操作按钮区 */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.testBtn, testing && styles.btnDisabled]}
                  onPress={handleTest}
                  disabled={testing}
                  activeOpacity={0.8}
                >
                  {testing ? (
                    <ActivityIndicator size="small" color={Palette.primary} />
                  ) : (
                    <>
                      <Zap size={15} color={Palette.primary} />
                      <Text style={styles.testBtnText}>测试连接</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>保存配置</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </>
        ) : (
          /* 模型选择视图：标准对称三列顶部栏 */
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity
                onPress={() => setViewMode('form')}
                style={styles.pickerNavBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <ChevronLeft size={20} color={Palette.cocoa[700]} />
              </TouchableOpacity>

              <View style={styles.pickerTitleCenter}>
                <Text style={styles.sheetTitle}>选择可用模型</Text>
                <Text style={styles.sheetSubtitle}>
                  共 {remoteModels.length} 个模型 · 点击即选
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => loadModels(true)}
                style={styles.pickerNavBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={fetchingModels}
                activeOpacity={0.7}
              >
                {fetchingModels ? (
                  <ActivityIndicator size="small" color={Palette.primary} />
                ) : (
                  <RefreshCw size={16} color={Palette.primary} />
                )}
              </TouchableOpacity>
            </View>

            {/* 搜索框 */}
            <View style={styles.searchWrapper}>
              <View style={styles.searchBox}>
                <Search size={15} color={Palette.cocoa[400]} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="搜索模型名称、归属厂商或参数大小..."
                  placeholderTextColor={Palette.cocoa[400]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery ? (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <X size={14} color={Palette.cocoa[400]} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* 分类筛选 Chip */}
            <View style={styles.filterSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsRow}
              >
                {[
                  { key: 'all', label: `全部 (${remoteModels.length})` },
                  { key: 'free', label: '含免费额度' },
                  { key: 'large', label: '70B+ 旗舰' },
                  { key: 'light', label: '轻量极速' },
                  { key: 'vision', label: '视觉多模态' },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.filterChip,
                      selectedFilter === f.key && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedFilter(f.key as FilterType)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedFilter === f.key && styles.filterChipTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 模型列表 */}
            <ScrollView
              style={styles.modelListScroll}
              contentContainerStyle={styles.modelListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredModels.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Cpu size={32} color={Palette.cocoa[400]} />
                  <Text style={styles.emptyText}>未找到符合条件的模型</Text>
                </View>
              ) : (
                filteredModels.map((item) => {
                  const isCurrent = item.id === model;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.modelCard,
                        isCurrent && styles.modelCardSelected,
                      ]}
                      onPress={() => handleSelectModel(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.modelCardHeader}>
                        <View style={styles.modelNameBox}>
                          <Text
                            style={[
                              styles.modelIdText,
                              isCurrent && styles.modelIdTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {item.id}
                          </Text>
                        </View>
                        {isCurrent && (
                          <View style={styles.selectedBadge}>
                            <Check size={12} color="#059669" />
                            <Text style={styles.selectedBadgeText}>当前选用</Text>
                          </View>
                        )}
                      </View>

                      {/* 标签栏：厂商、参数大小、免费状态、模型类型 */}
                      <View style={styles.badgesRow}>
                        <View style={styles.vendorBadge}>
                          <Text style={styles.vendorBadgeText}>
                            {item.vendorBadge}
                          </Text>
                        </View>

                        <View style={styles.sizeBadge}>
                          <Text style={styles.sizeBadgeText}>
                            {item.sizeBadge}
                          </Text>
                        </View>

                        {item.freeBadge ? (
                          <View style={styles.freeBadge}>
                            <Text style={styles.freeBadgeText}>
                              {item.freeBadge}
                            </Text>
                          </View>
                        ) : null}

                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>
                            {item.typeBadge}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  safeArea: {
    width: '100%',
  },

  // 表单主视图顶栏
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
  },
  formHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleTextWrap: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  sheetSubtitle: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.oat[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 模型选择器顶栏（对称三列布局）
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
  },
  pickerNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.oat[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerTitleCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  scrollArea: {
    maxHeight: 540,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  presetSection: {
    gap: 8,
  },
  presetsRow: {
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Palette.oat[100],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetChipIconOnly: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    borderRadius: 18,
  },
  presetChipActive: {
    backgroundColor: 'rgba(217, 107, 56, 0.12)',
    borderColor: Palette.primary,
  },
  keyBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginLeft: 6,
  },
  keyBadgeDotSolo: {
    position: 'absolute',
    right: 5,
    top: 4,
    marginLeft: 0,
  },
  keyBadgeDotActive: {
    backgroundColor: Palette.primary,
  },
  channelTip: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  channelBadgeWrap: {
    backgroundColor: 'rgba(217, 107, 56, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(217, 107, 56, 0.2)',
  },
  channelBadgeText: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '600',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  presetChipTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  fetchModelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(217, 107, 56, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(217, 107, 56, 0.2)',
  },
  fetchModelBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.primary,
  },
  textInput: {
    backgroundColor: Palette.oat[50],
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: Palette.cocoa[900],
  },
  keyInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: 36,
    justifyContent: 'center',
  },
  inputHint: {
    fontSize: 11,
    color: Palette.cocoa[400],
    paddingLeft: 2,
  },
  cloudCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  cloudCardReady: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  cloudCardWarn: {
    backgroundColor: Palette.oat[100],
    borderColor: Palette.dockBorder,
  },
  cloudCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cloudCardText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  cloudSyncBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#D1FAE5',
  },
  cloudSyncBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  resultCard: {
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  resultError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultMsg: {
    fontSize: 12,
    color: Palette.cocoa[700],
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(217, 107, 56, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(217, 107, 56, 0.25)',
    gap: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  testBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.primary,
  },
  saveBtn: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    backgroundColor: Palette.primary,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Picker 样式
  pickerContainer: {
    height: 580,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.oat[50],
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Palette.cocoa[900],
    paddingVertical: 0,
  },
  filterSection: {
    paddingBottom: 8,
  },
  filterChipsRow: {
    paddingHorizontal: 16,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: Palette.oat[100],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: 'rgba(217, 107, 56, 0.1)',
    borderColor: Palette.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Palette.cocoa[700],
  },
  filterChipTextActive: {
    fontWeight: '700',
    color: Palette.primary,
  },
  modelListScroll: {
    flex: 1,
  },
  modelListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    color: Palette.cocoa[400],
  },
  modelCard: {
    backgroundColor: Palette.oat[50],
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  modelCardSelected: {
    borderColor: Palette.primary,
    backgroundColor: 'rgba(217, 107, 56, 0.04)',
  },
  modelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modelNameBox: {
    flex: 1,
    paddingRight: 8,
  },
  modelIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  modelIdTextSelected: {
    color: Palette.primary,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  vendorBadge: {
    backgroundColor: Palette.oat[200],
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vendorBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.cocoa[700],
  },
  sizeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sizeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
  },
  freeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  typeBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7C3AED',
  },
});
