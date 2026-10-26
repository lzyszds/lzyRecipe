import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Sparkles, X, AlertCircle } from 'lucide-react-native';
import { create } from 'zustand';
import { BottomSheetModal } from './BottomSheetModal';
import { Palette } from '@/constants/theme';
import { AI_CHANNELS, getChannelModel, getChannelBaseUrl } from '@/constants/aiChannels';
import { useSettingsStore, AiSettings } from '@/store/settingsStore';

export interface AiGenerateConfirmOptions {
  title: string;
  /** 展示在标题下方的说明文字 */
  description?: string;
  dishName?: string;
  /** 输入框标签，默认「补充要求（可选）」 */
  inputLabel?: string;
  inputPlaceholder?: string;
  defaultValue?: string;
  confirmText?: string;
  /** 预计耗时提示，如「约需 1 分钟」 */
  estimated?: string;
}

export interface AiGenerateConfirmResult {
  confirmed: boolean;
  /** 按所选渠道与模型组装好的最终配置 */
  config: AiSettings;
  /** 用户输入的补充要求（已 trim，可为空串） */
  input: string;
}

interface AiGenerateConfirmState {
  options: AiGenerateConfirmOptions | null;
  resolver: ((result: AiGenerateConfirmResult | null) => void) | null;
  open: (options: AiGenerateConfirmOptions) => Promise<AiGenerateConfirmResult | null>;
  close: (result: AiGenerateConfirmResult | null) => void;
}

export const useAiGenerateConfirmStore = create<AiGenerateConfirmState>((set, get) => ({
  options: null,
  resolver: null,
  open: (options) => {
    // 已有弹层未处理时，先以取消结算上一次
    get().close(null);
    return new Promise<AiGenerateConfirmResult | null>((resolve) => {
      set({ options, resolver: resolve });
    });
  },
  close: (result) => {
    const { resolver } = get();
    set({ options: null, resolver: null });
    resolver?.(result);
  },
}));

/** 弹出「AI 生成前确认」：二次确认 + 渠道商切换 + 可输入补充要求 */
export function requestAiGenerateConfirm(options: AiGenerateConfirmOptions) {
  return useAiGenerateConfirmStore.getState().open(options);
}

/**
 * 全局挂载（_layout.tsx），所有 AI 生成入口共用：
 * 二次确认、渠道商即时切换、模型可改、补充要求可输入。
 */
export const AiGenerateConfirmSheet: React.FC = () => {
  const options = useAiGenerateConfirmStore((s) => s.options);
  const close = useAiGenerateConfirmStore((s) => s.close);
  const { ai } = useSettingsStore();

  const [channelId, setChannelId] = useState<string>('nvidia');
  const [model, setModel] = useState('');
  const [input, setInput] = useState('');

  useEffect(() => {
    if (options) {
      const initial = ai.providerId || 'nvidia';
      setChannelId(initial);
      setModel(getChannelModel(initial, ai.channelModels));
      setInput(options.defaultValue || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  if (!options) return null;

  const handleSwitchChannel = (id: string) => {
    setChannelId(id);
    setModel(getChannelModel(id, ai.channelModels));
  };

  const channelReady = (id: string) => {
    const hasKey =
      ai.channelKeys?.[id]?.trim() || (ai.providerId === id ? ai.apiKey?.trim() : '') || '';
    return Boolean(getChannelBaseUrl(id, ai.channelBaseUrls)?.trim() && hasKey);
  };

  const ready = channelReady(channelId) && Boolean(model.trim());

  const handleConfirm = () => {
    const meta = AI_CHANNELS.find((c) => c.id === channelId);
    if (!meta || !ready) return;
    const config: AiSettings = {
      providerId: meta.id,
      baseUrl: getChannelBaseUrl(channelId, ai.channelBaseUrls),
      apiKey:
        ai.channelKeys?.[channelId]?.trim() ||
        (ai.providerId === channelId ? ai.apiKey?.trim() : '') ||
        '',
      model: model.trim(),
    };
    close({ confirmed: true, config, input: input.trim() });
  };

  return (
    <BottomSheetModal visible={!!options} onClose={() => close(null)}>
      <View style={styles.wrap}>
        {/* 头部 */}
        <View style={styles.header}>
          <View style={styles.headerIconBg}>
            <Sparkles size={16} color={Palette.primary} strokeWidth={2.4} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {options.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {options.dishName ? `菜品：${options.dishName}` : 'AI 智能生成'}
              {options.estimated ? ` · ${options.estimated}` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => close(null)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={15} color={Palette.cocoa[400]} />
          </TouchableOpacity>
        </View>

        {options.description ? (
          <Text style={styles.descText}>{options.description}</Text>
        ) : null}

        {/* 渠道商切换 */}
        <Text style={styles.sectionLabel}>渠道商（点击切换，本次生成生效）</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {AI_CHANNELS.map((c) => {
            const isSelected = c.id === channelId;
            const readyForChannel = channelReady(c.id);
            const Icon = c.icon;
            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.chip,
                  isSelected && styles.chipActive,
                  isSelected && !readyForChannel && styles.chipActiveInvalid,
                ]}
                onPress={() => handleSwitchChannel(c.id)}
                activeOpacity={0.75}
              >
                <Icon size={isSelected ? 13 : 16} color={isSelected ? Palette.primary : c.iconColor} />
                {isSelected && (
                  <Text style={styles.chipText} numberOfLines={1}>
                    {c.name}
                  </Text>
                )}
                {!readyForChannel && (
                  <View style={[styles.missDot, isSelected && { backgroundColor: Palette.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {!channelReady(channelId) && (
          <View style={styles.warnRow}>
            <AlertCircle size={12} color="#D97706" />
            <Text style={styles.warnText}>该渠道还没配置 API Key，请先到「AI 助手配置」填写</Text>
          </View>
        )}

        {/* 模型（可修改） */}
        <Text style={styles.sectionLabel}>模型名称</Text>
        <TextInput
          style={styles.modelInput}
          value={model}
          onChangeText={setModel}
          placeholder="填写要使用的模型"
          placeholderTextColor={Palette.cocoa[200]}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* 补充要求（可输入） */}
        <Text style={styles.sectionLabel}>{options.inputLabel ?? '补充要求（可选）'}</Text>
        <TextInput
          style={[styles.modelInput, styles.reqInput]}
          value={input}
          onChangeText={setInput}
          placeholder={options.inputPlaceholder ?? '如：家庭厨房可执行、香一点'}
          placeholderTextColor={Palette.cocoa[200]}
          multiline
        />

        {/* 操作按钮 */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => close(null)} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>再想想</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, !ready && styles.btnDisabled]}
            disabled={!ready}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Sparkles size={13} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.confirmBtnText}>{options.confirmText ?? '开始生成'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  subtitle: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descText: {
    fontSize: 12,
    lineHeight: 18,
    color: Palette.cocoa[700],
    backgroundColor: Palette.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.cocoa[700],
    marginBottom: 8,
    marginTop: 4,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#F5F1EC',
  },
  chipActive: {
    backgroundColor: Palette.primarySoft,
    borderColor: Palette.primary,
  },
  chipActiveInvalid: {
    borderColor: '#D97706',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  missDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
    marginBottom: 4,
  },
  warnText: {
    flex: 1,
    fontSize: 11,
    color: '#D97706',
  },
  modelInput: {
    backgroundColor: '#F5F1EC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Palette.cocoa[900],
    marginBottom: 10,
  },
  reqInput: {
    minHeight: 60,
    textAlignVertical: 'top',
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F1EC',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.cocoa[700],
  },
  confirmBtn: {
    flex: 2,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: Palette.primary,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
