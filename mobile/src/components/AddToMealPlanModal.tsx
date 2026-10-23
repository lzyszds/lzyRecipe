import React, { useState, useEffect } from 'react';
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
import { X, Check } from 'lucide-react-native';
import { useMealPlanSheetStore } from '@/store/mealPlanSheetStore';
import { useWeeklyPlanStore, MealSlot, getSuggestedSlotForRecipeId } from '@/store/weeklyPlanStore';
import { useAllRecipes } from '@/lib/recipes';
import { RecipeImage } from './RecipeImage';
import { Palette } from '@/constants/theme';

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const MEAL_SLOTS: { key: MealSlot; label: string; icon: string }[] = [
  { key: 'breakfast', label: '早餐', icon: '🍳' },
  { key: 'lunch', label: '午餐', icon: '🍱' },
  { key: 'dinner', label: '晚餐', icon: '🍲' },
];

export const AddToMealPlanModal: React.FC = () => {
  const { targetRecipe, closeSheet, showToast } = useMealPlanSheetStore();
  const allRecipes = useAllRecipes();
  const { plans, assignRecipe } = useWeeklyPlanStore();

  // 默认选中今天 (0~6)
  const jsDay = new Date().getDay();
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1;

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(todayIndex);
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('dinner');

  // 当弹窗打开时，根据菜谱智能预选餐次
  useEffect(() => {
    if (targetRecipe) {
      setSelectedDayIndex(todayIndex);
      const suggestedSlot = getSuggestedSlotForRecipeId(targetRecipe.id, allRecipes);
      setSelectedSlot(suggestedSlot);
    }
  }, [targetRecipe]);

  if (!targetRecipe) return null;

  // 查看当前选中的这一天这一餐是否已有安排
  const currentDay = plans.find((p) => p.dayIndex === selectedDayIndex);
  const currentSlotEntry = currentDay ? currentDay[selectedSlot] : null;
  const existingRecipe = currentSlotEntry?.recipeId
    ? allRecipes.find((r) => r.id === currentSlotEntry.recipeId)
    : null;

  const handleConfirm = () => {
    assignRecipe(selectedDayIndex, selectedSlot, targetRecipe.id);
    const dayName = WEEK_DAYS[selectedDayIndex];
    const slotName = MEAL_SLOTS.find((s) => s.key === selectedSlot)?.label || '';
    closeSheet();
    showToast(`「${targetRecipe.name}」已安排到${dayName}${slotName}`);
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
            {/* 顶栏：标题与关闭 */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>加入餐盘计划</Text>
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

            {/* 当前目标菜谱小名片 */}
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
                  {targetRecipe.category} · 烹饪约 {targetRecipe.cookTime} 分钟
                </Text>
              </View>
            </View>

            {/* 星期选择条 (周一 ~ 周日) */}
            <Text style={styles.sectionLabel}>选择就餐日期</Text>
            <View style={styles.daysRow}>
              {WEEK_DAYS.map((dayName, idx) => {
                const isSelected = selectedDayIndex === idx;
                const isToday = idx === todayIndex;
                const dayPlan = plans.find((p) => p.dayIndex === idx);
                const count = [
                  dayPlan?.breakfast?.recipeId,
                  dayPlan?.lunch?.recipeId,
                  dayPlan?.dinner?.recipeId,
                ].filter(Boolean).length;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dayItem,
                      isSelected && styles.dayItemActive,
                    ]}
                    onPress={() => setSelectedDayIndex(idx)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.dayTag,
                        isSelected && styles.dayTagActive,
                      ]}
                    >
                      {isToday ? '今' : dayName.replace('周', '')}
                    </Text>
                    <Text
                      style={[
                        styles.dayName,
                        isSelected && styles.dayNameActive,
                      ]}
                    >
                      {dayName}
                    </Text>
                    <Text
                      style={[
                        styles.dayCount,
                        isSelected && styles.dayCountActive,
                      ]}
                    >
                      {count}/3
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 餐次分段切换 (早 / 午 / 晚) */}
            <Text style={styles.sectionLabel}>选择就餐餐次</Text>
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

            {/* 槽位现状提示 */}
            <View style={styles.statusBox}>
              <Text style={styles.statusText} numberOfLines={1}>
                {WEEK_DAYS[selectedDayIndex]} · {MEAL_SLOTS.find((s) => s.key === selectedSlot)?.label}：
                {existingRecipe ? (
                  <Text style={styles.statusConflict}> 当前已有「{existingRecipe.name}」（将替换）</Text>
                ) : (
                  <Text style={styles.statusEmpty}> 暂未安排，虚位以待</Text>
                )}
              </Text>
            </View>

            {/* 确定操作按钮 */}
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>
                {existingRecipe ? '确认替换并安排' : '确认加入该餐'}
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// 全局浮动轻量 Toast
export const GlobalMealPlanToast: React.FC = () => {
  const { toastMessage } = useMealPlanSheetStore();
  if (!toastMessage) return null;

  return (
    <View style={styles.toastContainer} pointerEvents="none">
      <View style={styles.toastBubble}>
        <Check size={14} color="#FFFFFF" />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 22, 18, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3ECE3',
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
    padding: 6,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.oat[50],
    borderRadius: 16,
    padding: 10,
    marginTop: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  thumbWrapper: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Palette.oat[100],
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  recipeMeta: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 3,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.cocoa[700],
    marginTop: 16,
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayItem: {
    flex: 1,
    backgroundColor: Palette.oat[50],
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECE3D7',
    gap: 2,
  },
  dayItemActive: {
    backgroundColor: Palette.apricot[500],
    borderColor: Palette.apricot[500],
  },
  dayTag: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Palette.cocoa[400],
  },
  dayTagActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  dayName: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  dayNameActive: {
    color: '#FFFFFF',
  },
  dayCount: {
    fontSize: 9,
    color: Palette.cocoa[400],
  },
  dayCountActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  slotBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.oat[50],
    borderRadius: 14,
    height: 42,
    gap: 6,
    borderWidth: 1,
    borderColor: '#ECE3D7',
  },
  slotBtnActive: {
    backgroundColor: Palette.apricot[50],
    borderColor: Palette.apricot[400],
  },
  slotIcon: {
    fontSize: 14,
  },
  slotLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  slotLabelActive: {
    color: Palette.apricot[600],
    fontWeight: '800',
  },
  statusBox: {
    backgroundColor: Palette.oat[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  statusText: {
    fontSize: 11.5,
    color: Palette.cocoa[700],
  },
  statusEmpty: {
    color: Palette.cocoa[400],
  },
  statusConflict: {
    color: Palette.apricot[600],
    fontWeight: '700',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.apricot[500],
    borderRadius: 999,
    height: 46,
    gap: 6,
    marginTop: 16,
    marginBottom: 6,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Toast
  toastContainer: {
    position: 'absolute',
    bottom: 84,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  toastBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 35, 30, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 8,
  },
  toastText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
