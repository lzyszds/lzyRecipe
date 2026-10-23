import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModal } from './BottomSheetModal';
import { confirm, toast } from '@/store/feedbackStore';
import {
  Cloud,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Download,
  Upload,
  Radio,
} from 'lucide-react-native';
import {
  useSettingsStore,
  isSyncConfigured,
  CloudSyncConfig,
} from '@/store/settingsStore';
import {
  useSyncStore,
  syncNow,
  pullFromCloud,
  pushToCloud,
  testConnection,
} from '@/lib/cloudSync';
import { Palette } from '@/constants/theme';

interface SyncSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const { sync, setSync } = useSettingsStore();
  const { status, lastSyncedAt, message } = useSyncStore();

  const [endpoint, setEndpoint] = useState(
    sync.endpoint?.trim() ? sync.endpoint : 'https://sync.lzyszds.cn'
  );
  const [token, setToken] = useState(sync.token);
  const [autoSync, setAutoSync] = useState(sync.autoSync);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (visible) {
      setEndpoint(sync.endpoint?.trim() ? sync.endpoint : 'https://sync.lzyszds.cn');
      setToken(sync.token);
      setAutoSync(sync.autoSync);
      setTestResult(null);
    }
  }, [visible]);

  const handleSave = (customEndpoint?: string, customToken?: string, customAutoSync?: boolean) => {
    const ep = (customEndpoint !== undefined ? customEndpoint : endpoint).trim() || 'https://sync.lzyszds.cn';
    const tk = (customToken !== undefined ? customToken : token).trim();
    const as = customAutoSync !== undefined ? customAutoSync : autoSync;
    setSync({
      endpoint: ep,
      token: tk,
      autoSync: as,
    });
  };

  const handleTest = async () => {
    const currentEndpoint = endpoint.trim() || 'https://sync.lzyszds.cn';
    const tempConfig: CloudSyncConfig = {
      endpoint: currentEndpoint,
      token: token.trim(),
      autoSync,
    };
    if (!isSyncConfigured(tempConfig)) {
      setTestResult({ ok: false, msg: '请先填写完整的密钥 (Token)' });
      return;
    }

    setTesting(true);
    try {
      const ok = await testConnection(tempConfig);
      if (ok) {
        handleSave(currentEndpoint, token.trim(), autoSync);
        setTestResult({ ok: true, msg: '连接成功！服务器运行正常' });
      } else {
        setTestResult({ ok: false, msg: '服务器响应异常，请核对地址' });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        msg: `连接失败: ${err?.message || '网络无法连通'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    const currentEndpoint = endpoint.trim() || 'https://sync.lzyszds.cn';
    handleSave(currentEndpoint, token.trim(), autoSync);
    const tempConfig: CloudSyncConfig = {
      endpoint: currentEndpoint,
      token: token.trim(),
      autoSync,
    };
    await syncNow(tempConfig);
  };

  const handlePull = async () => {
    const currentEndpoint = endpoint.trim() || 'https://sync.lzyszds.cn';
    const ok = await confirm({
      title: '从云端恢复',
      message: '将从云端拉取最新菜谱、收藏与备菜计划并覆盖本地同名内容，是否继续？',
      confirmText: '确定拉取',
      icon: 'cloud',
    });
    if (!ok) return;

    handleSave(currentEndpoint, token.trim(), autoSync);
    try {
      await pullFromCloud({
        endpoint: currentEndpoint,
        token: token.trim(),
        autoSync,
      });
      toast({ type: 'success', message: '已成功从云端恢复漫游数据！' });
    } catch (err: any) {
      toast({ type: 'error', message: `拉取失败: ${err?.message || '未知错误'}` });
    }
  };

  const handlePush = async () => {
    const currentEndpoint = endpoint.trim() || 'https://sync.lzyszds.cn';
    const ok = await confirm({
      title: '覆盖到云端',
      message: '将使用当前手机上的菜谱与计划完全覆盖云端存储，是否继续？',
      confirmText: '确定覆盖',
      destructive: true,
      icon: 'warning',
    });
    if (!ok) return;

    handleSave(currentEndpoint, token.trim(), autoSync);
    try {
      await pushToCloud({
        endpoint: currentEndpoint,
        token: token.trim(),
        autoSync,
      });
      toast({ type: 'success', message: '本地数据已成功同步覆盖至云端！' });
    } catch (err: any) {
      toast({ type: 'error', message: `推送失败: ${err?.message || '未知错误'}` });
    }
  };

  const isConfigured = Boolean((endpoint.trim() || 'https://sync.lzyszds.cn') && token.trim());
  const isSyncing = status === 'syncing';

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      sheetStyle={styles.sheet}
    >
      <SafeAreaView edges={['bottom']}>
        {/* 顶栏 */}
        <View style={styles.header}>
              <View style={styles.titleRow}>
                <View style={styles.iconCircle}>
                  <Cloud size={18} color={Palette.primary} />
                </View>
                <View>
                  <Text style={styles.title}>多端云同步</Text>
                  <Text style={styles.subtitle}>
                    与桌面端及后台实时数据漫游
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={Palette.inkMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* 同步状态看板 */}
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <View style={styles.statusIndicator}>
                    {isSyncing ? (
                      <ActivityIndicator size="small" color={Palette.primary} />
                    ) : status === 'success' ? (
                      <CheckCircle2 size={16} color={Palette.sage} />
                    ) : status === 'error' ? (
                      <AlertCircle size={16} color={Palette.roseWarm} />
                    ) : (
                      <Radio size={16} color={Palette.inkMuted} />
                    )}
                    <Text style={styles.statusTitle}>
                      {isSyncing
                        ? '正在同步中…'
                        : status === 'success'
                        ? '已成功同步'
                        : status === 'error'
                        ? '同步发生异常'
                        : '尚未配置同步'}
                    </Text>
                  </View>

                  {Boolean(lastSyncedAt) && (
                    <Text style={styles.lastSyncTime}>
                      {new Date(lastSyncedAt!).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  )}
                </View>

                {Boolean(message) && (
                  <Text style={styles.statusDesc} numberOfLines={2}>
                    {message}
                  </Text>
                )}
              </View>

              {/* 配置表单 */}
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>同步服务地址 (Endpoint)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://sync.lzyszds.cn"
                  placeholderTextColor={Palette.inkLight}
                  value={endpoint}
                  onChangeText={(val) => {
                    setEndpoint(val);
                    setTestResult(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.inputLabel}>同步密钥 (Token)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="用于跨设备配对识别的密钥"
                  placeholderTextColor={Palette.inkLight}
                  value={token}
                  onChangeText={(val) => {
                    setToken(val);
                    setTestResult(null);
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* 自动同步开关 */}
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchTitle}>打开应用时自动同步</Text>
                    <Text style={styles.switchSub}>
                      进入食谱时自动拉取并合并多端更新
                    </Text>
                  </View>
                  <Switch
                    value={autoSync}
                    onValueChange={(val) => {
                      setAutoSync(val);
                      setSync({ autoSync: val });
                    }}
                    trackColor={{ false: '#ECE4D8', true: Palette.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* 测试连接反馈 */}
                {testResult && (
                  <View
                    style={[
                      styles.testResultBox,
                      testResult.ok
                        ? styles.testResultSuccess
                        : styles.testResultError,
                    ]}
                  >
                    {testResult.ok ? (
                      <CheckCircle2 size={14} color={Palette.sage} />
                    ) : (
                      <AlertCircle size={14} color={Palette.roseWarm} />
                    )}
                    <Text
                      style={[
                        styles.testResultText,
                        {
                          color: testResult.ok ? Palette.sage : Palette.roseWarm,
                        },
                      ]}
                    >
                      {testResult.msg}
                    </Text>
                  </View>
                )}

                {/* 测试连接按钮 */}
                <TouchableOpacity
                  style={styles.testBtn}
                  onPress={handleTest}
                  disabled={testing}
                  activeOpacity={0.8}
                >
                  {testing ? (
                    <ActivityIndicator size="small" color={Palette.primary} />
                  ) : (
                    <ShieldCheck size={14} color={Palette.primary} />
                  )}
                  <Text style={styles.testBtnText}>
                    {testing ? '正在测试连接…' : '测试服务连接'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 核心同步操作 */}
              <TouchableOpacity
                style={[
                  styles.syncNowBtn,
                  (!isConfigured || isSyncing) && styles.syncNowBtnDisabled,
                ]}
                onPress={handleSyncNow}
                disabled={!isConfigured || isSyncing}
                activeOpacity={0.85}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <RefreshCw size={16} color="#FFFFFF" />
                )}
                <Text style={styles.syncNowBtnText}>
                  {isSyncing ? '正在双向合并同步…' : '立即双向同步'}
                </Text>
              </TouchableOpacity>

              {/* 单向进阶操作 */}
              {isConfigured && (
                <View style={styles.advancedRow}>
                  <TouchableOpacity
                    style={styles.advancedBtn}
                    onPress={handlePull}
                    activeOpacity={0.75}
                  >
                    <Download size={13} color={Palette.inkMuted} />
                    <Text style={styles.advancedBtnText}>从云端拉取</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.advancedBtn}
                    onPress={handlePush}
                    activeOpacity={0.75}
                  >
                    <Upload size={13} color={Palette.inkMuted} />
                    <Text style={styles.advancedBtnText}>覆盖到云端</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 22, 18, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE4D8',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.ink,
  },
  subtitle: {
    fontSize: 11,
    color: Palette.inkMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: Palette.tagWarm,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECE4D8',
    marginBottom: 14,
    gap: 6,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.ink,
  },
  lastSyncTime: {
    fontSize: 11,
    color: Palette.inkMuted,
  },
  statusDesc: {
    fontSize: 11,
    color: Palette.inkMuted,
    lineHeight: 16,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECE4D8',
    marginBottom: 14,
    gap: 10,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.ink,
    marginTop: 2,
  },
  textInput: {
    height: 42,
    backgroundColor: Palette.canvas,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 12,
    color: Palette.ink,
    borderWidth: 1,
    borderColor: '#ECE4D8',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginTop: 4,
  },
  switchInfo: {
    flex: 1,
    paddingRight: 12,
  },
  switchTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.ink,
  },
  switchSub: {
    fontSize: 10.5,
    color: Palette.inkMuted,
    marginTop: 1,
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  testResultSuccess: {
    backgroundColor: Palette.sageSoft,
  },
  testResultError: {
    backgroundColor: Palette.roseSoft,
  },
  testResultText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 12,
    backgroundColor: Palette.primarySoft,
    gap: 6,
    marginTop: 2,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 16,
    backgroundColor: Palette.primary,
    gap: 8,
    marginBottom: 10,
  },
  syncNowBtnDisabled: {
    opacity: 0.5,
  },
  syncNowBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  advancedRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  advancedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE4D8',
    gap: 5,
  },
  advancedBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Palette.inkMuted,
  },
});
