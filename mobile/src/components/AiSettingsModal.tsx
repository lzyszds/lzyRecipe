import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
} from 'lucide-react-native';
import {
  useSettingsStore,
  isAiConfigured,
  AiSettings,
} from '@/store/settingsStore';
import { testAiConnection, AiError } from '@/lib/ai';
import { toast } from '@/store/feedbackStore';
import { Palette } from '@/constants/theme';

interface AiSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESETS = [
  {
    name: 'DeepSeek (推荐)',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  {
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
  },
  {
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
  },
  {
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
  },
  {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
];

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const { ai, setAi } = useSettingsStore();

  const [baseUrl, setBaseUrl] = useState(ai.baseUrl || 'https://api.deepseek.com/v1');
  const [apiKey, setApiKey] = useState(ai.apiKey || '');
  const [model, setModel] = useState(ai.model || 'deepseek-chat');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    msg: string;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      setBaseUrl(ai.baseUrl || 'https://api.deepseek.com/v1');
      setApiKey(ai.apiKey || '');
      setModel(ai.model || 'deepseek-chat');
      setTestResult(null);
    }
  }, [visible, ai]);

  const handleApplyPreset = (preset: (typeof PRESETS)[0]) => {
    setBaseUrl(preset.baseUrl);
    setModel(preset.model);
    setTestResult(null);
    toast({ type: 'info', message: `已应用 ${preset.name} 预设` });
  };

  const handleSave = () => {
    const finalBaseUrl = baseUrl.trim() || 'https://api.deepseek.com/v1';
    const finalApiKey = apiKey.trim();
    const finalModel = model.trim() || 'deepseek-chat';

    setAi({
      baseUrl: finalBaseUrl,
      apiKey: finalApiKey,
      model: finalModel,
    });
    toast({ type: 'success', message: 'AI 配置已保存' });
    onClose();
  };

  const handleTest = async () => {
    const tempConfig: AiSettings = {
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

    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnection(tempConfig);
      setTestResult({
        ok: true,
        latencyMs: res.latencyMs,
        msg: `连接成功 (耗时 ${res.latencyMs}ms)\nAI 回复:「${res.reply}」`,
      });
      // 自动保存已测试通过的配置
      setAi(tempConfig);
    } catch (err: any) {
      setTestResult({
        ok: false,
        msg: err.message || '连接失败，请检查网络或密钥配置',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar style="light" animated />
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            {/* 顶部标题栏 */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <View style={styles.iconBadge}>
                  <Sparkles size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.sheetTitle}>AI 智能厨师配置</Text>
                  <Text style={styles.sheetSubtitle}>
                    支持标准 OpenAI 接口规范 (DeepSeek/通义/OpenAI等)
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
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 快速预设 */}
              <View style={styles.presetSection}>
                <Text style={styles.fieldLabel}>常用服务商快捷预设：</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.presetsRow}
                >
                  {PRESETS.map((p) => {
                    const isSelected = baseUrl === p.baseUrl && model === p.model;
                    return (
                      <TouchableOpacity
                        key={p.name}
                        style={[
                          styles.presetChip,
                          isSelected && styles.presetChipActive,
                        ]}
                        onPress={() => handleApplyPreset(p)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            isSelected && styles.presetChipTextActive,
                          ]}
                        >
                          {p.name}
                        </Text>
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
                  placeholder="https://api.deepseek.com/v1"
                  placeholderTextColor={Palette.cocoa[400]}
                  value={baseUrl}
                  onChangeText={setBaseUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.inputHint}>
                  支持填完整根地址或包含 /chat/completions 的路径
                </Text>
              </View>

              {/* 字段 2：API Key */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <KeyRound size={14} color={Palette.cocoa[700]} />
                  <Text style={styles.fieldLabel}>API Key (令牌密钥)</Text>
                </View>
                <View style={styles.keyInputWrapper}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, paddingRight: 40 }]}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                    placeholderTextColor={Palette.cocoa[400]}
                    value={apiKey}
                    onChangeText={setApiKey}
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
                  仅保存在您本地设备中，绝不会泄露
                </Text>
              </View>

              {/* 字段 3：模型名称 */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Bot size={14} color={Palette.cocoa[700]} />
                  <Text style={styles.fieldLabel}>模型名称 (Model)</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="deepseek-chat / gpt-4o-mini"
                  placeholderTextColor={Palette.cocoa[400]}
                  value={model}
                  onChangeText={setModel}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
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
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.oat[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    maxHeight: 520,
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Palette.oat[100],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetChipActive: {
    backgroundColor: 'rgba(217, 107, 56, 0.1)',
    borderColor: Palette.primary,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  presetChipTextActive: {
    color: Palette.primary,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
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
});
