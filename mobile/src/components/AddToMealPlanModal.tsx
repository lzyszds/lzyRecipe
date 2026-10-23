import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { X, Check, Calendar, Sparkles } from 'lucide-react-native';
import { useMealPlanSheetStore } from '@/store/mealPlanSheetStore';
import { useBentoStore, MealType } from '@/store/bentoStore';
import { useAllRecipes } from '@/lib/recipes';
import { RecipeImage } from './RecipeImage';
import {
  getTodayString,
  getMondayOf,
  getWeekDates,
  formatMonthDay,
  getWeekdayName,
  isToday,
} from '@/lib/bentoDate';
import { toast } from '@/store/feedbackStore';
import { Palette } from '@/constants/theme';

const MEAL_SLOTS: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: '早餐', icon: '🍳' },
  { key: 'lunch', label: '午餐', icon: '🍱' },
  { key: 'dinner', label: '晚餐', icon: '🍲' },
];

export const AddToMealPlanModal: React.FC = () => {
  const { targetRecipe, closeSheet } = useMealPlanSheetStore();
  const allRecipes = useAllRecipes();
  const {
    getDayBento,
    addDishesToMeal,
    applyLunchBentoToWorkdays,
  } = useBentoStore();

  const todayStr = getTodayString();
  const mondayStr = getMondayOf(todayStr);
  const weekDates = useMemo(() => getWeekDates(mondayStr), [mondayStr]);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<MealType>('dinner');

  useEffect(() => {
    if (targetRecipe) {
      setSelectedDate(todayStr);
      // 根据菜系智能推断
      if (['早餐', '饮品', '甜点'].includes(targetRecipe.category)) {
        setSelectedSlot('breakfast');
      } else {
        setSelectedSlot('dinner');
      }
    }
  }, [targetRecipe, todayStr]);

  if (!targetRecipe) return null;

  const currentDayBento = getDayBento(selectedDate);
  const existingDishes = currentDayBento[selectedSlot] || [];

  const handleConfirm = () => {
    addDishesToMeal(selectedDate, selectedSlot, [targetRecipe.id]);
    const dayLabel = `${formatMonthDay(selectedDate)} ${getWeekdayName(selectedDate)}`;
    const slotLabel = MEAL_SLOTS.find((s) => s.key === selectedSlot)?.label || '';
    closeSheet();
    toast({
      type: 'success',
      message: `🎉 已将「${targetRecipe.name}」排入【${dayLabel} ${slotLabel}】便当！`,
    });
  };

  const handleApplyWorkdayLunch = () => {
    applyLunchBentoToWorkdays(mondayStr, targetRecipe.id);
    closeSheet();
    toast({
      type: 'success',
      message: `🍱 太省心啦！已将「${targetRecipe.name}」排入周一至周五的全部午餐！`,
    });
  };

  return (
    <Modal
      visible={Boolean(targetRecipe)}
      transparent
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={closeSheet}
    >
      <StatusBar style="light" animated />
      <Pressable style={styles.overlay} onPress={closeSheet}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']}>
            {/* 顶栏 */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>排入便当盒</Text>
                <Text style={styles.sheetSubtitle}>选择要把这道美味安排在哪一天哪一餐</Text>
              </View>
              <TouchableOpacity
                onPress={closeSheet}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={Palette.cocoa[400]} />
              </TouchableOpacity>
            </View>

            {/* 菜品小卡片 */}
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
                <Text style={styles.recipeMeta}>
                  {targetRecipe.category} · ⏱ {targetRecipe.cookTime}分钟 · {targetRecipe.ingredients.length} 种配料
                </Text>
              </View>
            </View>

            {/* 星期日期横排选择 */}
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
                  <TouchableOpacity
                    key={dateStr}
                    style={[
                      styles.dayItem,
                      isSelected && styles.dayItemActive,
                    ]}
                    onPress={() => setSelectedDate(dateStr)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.dayTag,
                        isSelected && styles.dayTagActive,
                      ]}
                    >
                      {today ? '今' : getWeekdayName(dateStr).replace('周', '')}
                    </Text>
                    <Text
                      style={[
                        styles.dayDate,
                        isSelected && styles.dayDateActive,
                      ]}
                    >
                      {formatMonthDay(dateStr)}
                    </Text>
                    <Text
                      style={[
                        styles.dayCount,
                        isSelected && styles.dayCountActive,
                      ]}
                    >
                      {total}菜
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 餐次切换 */}
            <Text style={styles.sectionLabel}>选择餐次</Text>
            <View style={styles.slotsRow}>
              {MEAL_SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot.key;
                return (
                  <TouchableOpacity
                    key={slot.key}
                    style={[
                      styles.slotBtn,
                      isSelected && styles.slotBtnActive,
                    ]}
                    onPress={() => setSelectedSlot(slot.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.slotIcon}>{slot.icon}</Text>
                    <Text
                      style={[
                        styles.slotLabel,
                        isSelected && styles.slotLabelActive,
                      ]}
                    >
                      {slot.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 状态与快捷操作 */}
            <View style={styles.statusBox}>
              <Text style={styles.statusText} numberOfLines={1}>
                {formatMonthDay(selectedDate)} {getWeekdayName(selectedDate)} · {
                  MEAL_SLOTS.find((s) => s.key === selectedSlot)?.label
                }：
                {existingDishes.length > 0 ? (
                  <Text style={styles.statusHasDishes}>
                    已有 {existingDishes.length} 道菜（将组合为多菜餐盘）
                  </Text>
                ) : (
                  <Text style={styles.statusEmpty}>暂无安排，随时添菜</Text>
                )}
              </Text>
            </View>

            {/* 上班族快捷：午餐带饭 */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.workdayBtn}
                onPress={handleApplyWorkdayLunch}
                activeOpacity={0.8}
              >
                <Sparkles size={14} color={Palette.primary} />
                <Text style={styles.workdayBtnText}>一键周一至五午餐带饭</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirm}
                activeOpacity={0.85}
              >
                <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.confirmBtnText}>放入便当格</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.oat[50],
    borderRadius: 14,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    marginBottom: 16,
  },
  thumbWrapper: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Palette.oat[100],
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  recipeMeta: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 2,
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
    marginBottom: 14,
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
  slotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  slotBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Palette.oat[50],
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    gap: 6,
  },
  slotBtnActive: {
    backgroundColor: 'rgba(217, 107, 56, 0.12)',
    borderColor: Palette.primary,
  },
  slotIcon: {
    fontSize: 14,
  },
  slotLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.cocoa[700],
  },
  slotLabelActive: {
    color: Palette.primary,
  },
  statusBox: {
    backgroundColor: Palette.oat[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    color: Palette.cocoa[700],
  },
  statusHasDishes: {
    color: Palette.primary,
    fontWeight: '700',
  },
  statusEmpty: {
    color: Palette.cocoa[400],
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  workdayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(217, 107, 56, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(217, 107, 56, 0.25)',
    gap: 4,
  },
  workdayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    backgroundColor: Palette.primary,
    gap: 6,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
