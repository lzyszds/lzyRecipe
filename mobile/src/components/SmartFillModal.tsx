import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Sparkles, Calendar, CalendarDays, X, Check, Flame } from 'lucide-react-native';
import { BottomSheetModal } from './BottomSheetModal';
import { formatMonthDay, getWeekdayName, formatWeekRange } from '../lib/bentoDate';
import { planBentoWithAi } from '../lib/aiRecipe';
import { useBentoStore } from '../store/bentoStore';
import { useAllRecipes } from '../lib/recipes';
import { Palette, Radius } from '../constants/theme';
import { toast } from '../store/feedbackStore';

interface SmartFillModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  mondayStr: string;
  weekDates: string[];
  onFilled?: (count: number, summary: string) => void;
}

const INSPIRATION_CHIPS = [
  '今天上火，要清淡降火',
  '减脂高蛋白少油',
  '20分钟内快手家常菜',
  '少油少盐温润养胃',
  '香辣过瘾下饭菜',
  '海鲜为主清爽鲜美',
];

export const SmartFillModal: React.FC<SmartFillModalProps> = ({
  visible,
  onClose,
  selectedDate,
  mondayStr,
  weekDates,
  onFilled,
}) => {
  const [scope, setScope] = useState<'day' | 'week'>('day');
  const [userPrompt, setUserPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const allRecipes = useAllRecipes();
  const { bentoByDate, batchFillSlots } = useBentoStore();

  const handleStartFill = async () => {
    setLoading(true);
    try {
      const plan = await planBentoWithAi({
        scope,
        targetDate: selectedDate,
        weekDates,
        userPrompt: userPrompt.trim(),
        allRecipes,
        currentBentoByDate: bentoByDate,
      });

      const count = batchFillSlots(plan.slots);
      if (count > 0) {
        toast({
          type: 'success',
          message: `已为您填入 ${count} 道菜！${plan.summary}`,
        });
        onFilled?.(count, plan.summary);
        onClose();
      } else {
        toast({
          type: 'info',
          message: plan.summary || '所选范围内的餐位已满，未做改动',
        });
      }
    } catch (err: any) {
      toast({
        type: 'error',
        message: err.message || '配餐过程中遇到问题，请重试',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChip = (chip: string) => {
    setUserPrompt(chip);
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* 顶部标题栏 */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconBadge}>
                <Sparkles size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.title}>AI 智能配餐填补</Text>
                <Text style={styles.subtitle}>
                  自动保留已手动排入的菜品，仅为剩余空位智能搭配
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={16} color={Palette.inkMuted} />
            </TouchableOpacity>
          </View>

          {/* 填充范围切换 (当日 / 本周) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>选择填充范围</Text>
            <View style={styles.scopeRow}>
              <TouchableOpacity
                style={[styles.scopeBtn, scope === 'day' && styles.scopeBtnActive]}
                onPress={() => setScope('day')}
                activeOpacity={0.8}
              >
                <Calendar
                  size={15}
                  color={scope === 'day' ? Palette.primary : Palette.inkMuted}
                />
                <View style={styles.scopeBtnContent}>
                  <Text
                    style={[
                      styles.scopeBtnTitle,
                      scope === 'day' && styles.scopeBtnTitleActive,
                    ]}
                  >
                    填充当日空位
                  </Text>
                  <Text style={styles.scopeBtnDesc}>
                    {formatMonthDay(selectedDate)} ({getWeekdayName(selectedDate)})
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scopeBtn, scope === 'week' && styles.scopeBtnActive]}
                onPress={() => setScope('week')}
                activeOpacity={0.8}
              >
                <CalendarDays
                  size={15}
                  color={scope === 'week' ? Palette.primary : Palette.inkMuted}
                />
                <View style={styles.scopeBtnContent}>
                  <Text
                    style={[
                      styles.scopeBtnTitle,
                      scope === 'week' && styles.scopeBtnTitleActive,
                    ]}
                  >
                    填充本周全部空位
                  </Text>
                  <Text style={styles.scopeBtnDesc}>整周 7 天所有剩余餐位</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* 告诉 AI 需求输入框 */}
          <View style={styles.section}>
            <View style={styles.inputLabelRow}>
              <Text style={styles.sectionLabel}>告诉 AI 你的身体或饮食诉求</Text>
              <View style={styles.aiTag}>
                <Sparkles size={10} color={Palette.primary} />
                <Text style={styles.aiTagText}>AI 理解上下文</Text>
              </View>
            </View>

            <TextInput
              style={styles.textInput}
              value={userPrompt}
              onChangeText={setUserPrompt}
              placeholder="例如：我今天上火想吃清淡点的、减脂高蛋白少油、或是 20 分钟内快手家常菜..."
              placeholderTextColor={Palette.inkLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* 快捷灵感芯片 */}
          <View style={styles.section}>
            <Text style={styles.chipsLabel}>快捷灵感点选：</Text>
            <View style={styles.chipsWrap}>
              {INSPIRATION_CHIPS.map((chip) => {
                const isSelected = userPrompt === chip;
                return (
                  <TouchableOpacity
                    key={chip}
                    style={[styles.chipPill, isSelected && styles.chipPillActive]}
                    onPress={() => handleSelectChip(chip)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {chip}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 提交填充按钮 */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleStartFill}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  AI 正在根据您的需求严选食材配菜...
                </Text>
              </View>
            ) : (
              <View style={styles.submitBtnContent}>
                <Sparkles size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  开始智能填充（{scope === 'day' ? '当日' : '整周'}）
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  keyboardWrap: {
    maxHeight: '90%',
  },
  scroll: {
    maxHeight: 520,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.ink,
  },
  subtitle: {
    fontSize: 11,
    color: Palette.inkMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.tagWarm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.ink,
    marginBottom: 8,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scopeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFEAE2',
    gap: 8,
  },
  scopeBtnActive: {
    borderColor: Palette.primary,
    backgroundColor: Palette.primarySoft,
  },
  scopeBtnContent: {
    flex: 1,
  },
  scopeBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.ink,
  },
  scopeBtnTitleActive: {
    color: Palette.primary,
  },
  scopeBtnDesc: {
    fontSize: 11,
    color: Palette.inkMuted,
    marginTop: 2,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  aiTagText: {
    fontSize: 10,
    color: Palette.primary,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E7DFD4',
    padding: 12,
    fontSize: 13,
    color: Palette.ink,
    minHeight: 74,
    lineHeight: 18,
  },
  chipsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.inkMuted,
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Palette.tagWarm,
  },
  chipPillActive: {
    backgroundColor: Palette.primary,
  },
  chipText: {
    fontSize: 11,
    color: Palette.ink,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: Palette.primary,
    borderRadius: Radius.lg,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
