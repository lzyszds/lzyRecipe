import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  X,
  Sunrise,
  Sun,
  Moon,
  Clock,
  Utensils,
  Sparkles,
  CalendarDays,
  PlusCircle,
} from 'lucide-react-native';
import { useMealPlanSheetStore } from '../store/mealPlanSheetStore';
import { useBentoStore, MealType } from '../store/bentoStore';
import { RecipeImage } from './RecipeImage';
import { BottomSheetModal } from './BottomSheetModal';
import {
  getTodayString,
  getMondayOf,
  getWeekDates,
  formatMonthDay,
  getWeekdayName,
  isToday,
} from '../lib/bentoDate';
import { toast } from '../store/feedbackStore';
import { Palette } from '../constants/theme';

export const AddToMealPlanModal: React.FC = () => {
  const { targetRecipe, closeSheet } = useMealPlanSheetStore();
  const {
    getDayBento,
    addDishesToMeal,
    applyLunchBentoToWorkdays,
  } = useBentoStore();

  const todayStr = getTodayString();
  const mondayStr = getMondayOf(todayStr);
  const weekDates = useMemo(() => getWeekDates(mondayStr), [mondayStr]);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  useEffect(() => {
    if (targetRecipe) {
      setSelectedDate(todayStr);
    }
  }, [targetRecipe, todayStr]);

  if (!targetRecipe) return null;

  const currentDayBento = getDayBento(selectedDate);

  const handleSelectSlot = (slotKey: MealType, slotLabel: string) => {
    addDishesToMeal(selectedDate, slotKey, [targetRecipe.id]);
    const dayLabel = `${formatMonthDay(selectedDate)} ${getWeekdayName(selectedDate)}`;
    closeSheet();
    toast({
      type: 'success',
      message: `已将「${targetRecipe.name}」排入【${dayLabel} ${slotLabel}】`,
    });
  };

  const handleApplyWorkdayLunch = () => {
    applyLunchBentoToWorkdays(mondayStr, targetRecipe.id);
    closeSheet();
    toast({
      type: 'success',
      message: `已将「${targetRecipe.name}」排入本周周一至周五午餐便当`,
    });
  };

  const slotsConfig: {
    key: MealType;
    label: string;
    sublabel: string;
    icon: typeof Sunrise;
    color: string;
    bg: string;
    borderColor: string;
  }[] = [
    {
      key: 'breakfast',
      label: '早餐',
      sublabel: '晨间营养活力',
      icon: Sunrise,
      color: Palette.honey[500],
      bg: 'rgba(230, 168, 74, 0.08)',
      borderColor: 'rgba(230, 168, 74, 0.3)',
    },
    {
      key: 'lunch',
      label: '午餐',
      sublabel: '便当元气充电',
      icon: Sun,
      color: Palette.sage[600],
      bg: 'rgba(124, 154, 126, 0.08)',
      borderColor: 'rgba(124, 154, 126, 0.3)',
    },
    {
      key: 'dinner',
      label: '晚餐',
      sublabel: '温热犒劳慢品',
      icon: Moon,
      color: Palette.primary,
      bg: 'rgba(217, 107, 56, 0.08)',
      borderColor: 'rgba(217, 107, 56, 0.3)',
    },
  ];

  return (
    <BottomSheetModal
      visible={Boolean(targetRecipe)}
      onClose={closeSheet}
      sheetStyle={styles.sheetContainer}
    >
      <View style={styles.content}>
        {/* 顶部标题与关闭 */}
        <View style={styles.sheetHeader}>
          <View style={styles.headerLeft}>
            <CalendarDays size={18} color={Palette.cocoa[900]} />
            <Text style={styles.sheetTitle}>一键排入便当盒</Text>
          </View>
          <Pressable
            onPress={closeSheet}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color={Palette.cocoa[400]} />
          </Pressable>
        </View>

        {/* 待排菜品卡片 */}
        <View style={styles.recipeCard}>
          <View style={styles.thumbWrapper}>
            <RecipeImage
              coverImage={targetRecipe.coverImage}
              name={targetRecipe.name}
              category={targetRecipe.category}
            />
          </View>
          <View style={styles.recipeInfo}>
            <Text style={styles.recipeName} numberOfLines={1}>
              {targetRecipe.name}
            </Text>
            <View style={styles.recipeMetaRow}>
              <View style={styles.metaTag}>
                <Clock size={11} color={Palette.cocoa[400]} />
                <Text style={styles.metaText}>{targetRecipe.cookTime}分钟</Text>
              </View>
              <View style={styles.metaTag}>
                <Utensils size={11} color={Palette.cocoa[400]} />
                <Text style={styles.metaText}>
                  {targetRecipe.ingredients?.length || 0} 种食材
                </Text>
              </View>
              <Text style={styles.categoryText}>{targetRecipe.category}</Text>
            </View>
          </View>
        </View>

        {/* 1. 选择安排日期 */}
        <Text style={styles.sectionLabel}>选择排入日期</Text>
        <View style={styles.daysRow}>
          {weekDates.map((dateStr) => {
            const isSelected = selectedDate === dateStr;
            const today = isToday(dateStr);
            const dayBento = getDayBento(dateStr);
            const total =
              dayBento.breakfast.length +
              dayBento.lunch.length +
              dayBento.dinner.length;

            return (
              <Pressable
                key={dateStr}
                style={[styles.dayItem, isSelected && styles.dayItemActive]}
                onPress={() => setSelectedDate(dateStr)}
              >
                <Text style={[styles.dayTag, isSelected && styles.dayTagActive]}>
                  {today ? '今' : getWeekdayName(dateStr).replace('周', '')}
                </Text>
                <Text style={[styles.dayDate, isSelected && styles.dayDateActive]}>
                  {formatMonthDay(dateStr)}
                </Text>
                <Text style={[styles.dayCount, isSelected && styles.dayCountActive]}>
                  {total}菜
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 2. 点击直接安排餐次 (一键排入) */}
        <Text style={styles.sectionLabel}>
          点击餐次即可一键加入 ({formatMonthDay(selectedDate)} {getWeekdayName(selectedDate)})
        </Text>
        <View style={styles.slotsColumn}>
          {slotsConfig.map((slot) => {
            const SlotIcon = slot.icon;
            const existingCount = currentDayBento[slot.key]?.length || 0;

            return (
              <Pressable
                key={slot.key}
                style={[
                  styles.slotActionCard,
                  { backgroundColor: slot.bg, borderColor: slot.borderColor },
                ]}
                onPress={() => handleSelectSlot(slot.key, slot.label)}
              >
                <View style={styles.slotCardLeft}>
                  <View style={[styles.slotIconWrap, { backgroundColor: '#FFFFFF' }]}>
                    <SlotIcon size={20} color={slot.color} />
                  </View>
                  <View>
                    <View style={styles.slotTitleRow}>
                      <Text style={styles.slotLabel}>{slot.label}</Text>
                      {existingCount > 0 ? (
                        <View style={styles.slotCountBadge}>
                          <Text style={styles.slotCountText}>已有 {existingCount} 道菜</Text>
                        </View>
                      ) : (
                        <Text style={styles.slotEmptyHint}>空闲餐格</Text>
                      )}
                    </View>
                    <Text style={styles.slotSub}>{slot.sublabel}</Text>
                  </View>
                </View>

                <View style={[styles.addSlotBtn, { backgroundColor: slot.color }]}>
                  <PlusCircle size={15} color="#FFFFFF" />
                  <Text style={styles.addSlotBtnText}>排入{slot.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* 快捷方式：周一至五午餐 */}
        <Pressable
          style={styles.workdayShortcut}
          onPress={handleApplyWorkdayLunch}
        >
          <Sparkles size={15} color={Palette.primary} />
          <Text style={styles.workdayShortcutText}>
            上班族快捷：一键排入周一至周五午餐带饭
          </Text>
        </Pressable>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    paddingBottom: 28,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.oat[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.oat[50],
    borderRadius: 16,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    marginBottom: 16,
  },
  thumbWrapper: {
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Palette.oat[100],
  },
  recipeInfo: {
    flex: 1,
    gap: 4,
  },
  recipeName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  recipeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  categoryText: {
    fontSize: 11,
    color: Palette.cocoa[700],
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.cocoa[700],
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 4,
  },
  dayItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Palette.oat[50],
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    gap: 2,
  },
  dayItemActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  dayTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.cocoa[400],
  },
  dayTagActive: {
    color: '#FFFFFF',
  },
  dayDate: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  dayDateActive: {
    color: '#FFFFFF',
  },
  dayCount: {
    fontSize: 9,
    color: Palette.cocoa[400],
  },
  dayCountActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  slotsColumn: {
    gap: 10,
    marginBottom: 16,
  },
  slotActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  slotCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  slotCountBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  slotCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Palette.cocoa[700],
  },
  slotEmptyHint: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  slotSub: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addSlotBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  workdayShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: 'rgba(217, 107, 56, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(217, 107, 56, 0.25)',
  },
  workdayShortcutText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
});
