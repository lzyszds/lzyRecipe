import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, CalendarDays, Trash2, X, AlertCircle } from 'lucide-react-native';
import { BottomSheetModal } from './BottomSheetModal';
import { formatMonthDay, getWeekdayName, formatWeekRange } from '../lib/bentoDate';
import { Palette, Radius } from '../constants/theme';

interface ClearBentoModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  mondayStr: string;
  onClearDay: () => void;
  onClearWeek: () => void;
}

export const ClearBentoModal: React.FC<ClearBentoModalProps> = ({
  visible,
  onClose,
  selectedDate,
  mondayStr,
  onClearDay,
  onClearWeek,
}) => {
  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {/* 顶部标题栏 */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.iconBadge}>
              <Trash2 size={16} color="#DC2626" />
            </View>
            <View>
              <Text style={styles.title}>清空便当盒</Text>
              <Text style={styles.subtitle}>请选择需要清空的排餐范围</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={16} color={Palette.inkMuted} />
          </TouchableOpacity>
        </View>

        {/* 选项列表 */}
        <View style={styles.optionsWrap}>
          {/* 清空当日 */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => {
              onClose();
              onClearDay();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.optionIconBox}>
              <Calendar size={18} color={Palette.primary} />
            </View>
            <View style={styles.optionContent}>
              <View style={styles.optionTitleRow}>
                <Text style={styles.optionTitle}>清空当日便当</Text>
                <View style={styles.dayTag}>
                  <Text style={styles.dayTagText}>仅当天</Text>
                </View>
              </View>
              <Text style={styles.optionDesc}>
                清空 {formatMonthDay(selectedDate)} ({getWeekdayName(selectedDate)}) 的早、中、晚餐位
              </Text>
            </View>
          </TouchableOpacity>

          {/* 清空整周 */}
          <TouchableOpacity
            style={[styles.optionCard, styles.optionCardDanger]}
            onPress={() => {
              onClose();
              onClearWeek();
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIconBox, styles.optionIconBoxDanger]}>
              <CalendarDays size={18} color="#DC2626" />
            </View>
            <View style={styles.optionContent}>
              <View style={styles.optionTitleRow}>
                <Text style={[styles.optionTitle, styles.optionTitleDanger]}>清空本周便当</Text>
                <View style={[styles.dayTag, styles.dayTagDanger]}>
                  <Text style={[styles.dayTagText, styles.dayTagTextDanger]}>整周 7 天</Text>
                </View>
              </View>
              <Text style={styles.optionDesc}>
                清空 {formatWeekRange(mondayStr)} 所有 7 天内的全部餐位安排
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 底部取消按钮 */}
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.cancelBtnText}>取消</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
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
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.ink,
  },
  subtitle: {
    fontSize: 12,
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
  optionsWrap: {
    gap: 12,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    gap: 12,
  },
  optionCardDanger: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFBF7',
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Palette.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconBoxDanger: {
    backgroundColor: '#FEE2E2',
  },
  optionContent: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.ink,
  },
  optionTitleDanger: {
    color: '#DC2626',
  },
  dayTag: {
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.primary,
  },
  dayTagDanger: {
    backgroundColor: '#FEE2E2',
  },
  dayTagTextDanger: {
    color: '#DC2626',
  },
  optionDesc: {
    fontSize: 12,
    color: Palette.inkMuted,
    lineHeight: 16,
  },
  cancelBtn: {
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Palette.tagWarm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.ink,
  },
});
