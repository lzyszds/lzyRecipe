import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useMealPlanSheetStore } from '../store/mealPlanSheetStore';
import { useBentoStore, MealType } from '../store/bentoStore';
import { RecipeImage } from './RecipeImage';
import { BottomSheetModal } from './BottomSheetModal';
import {
  getTodayString,
  getMondayOf,
  getWeekDates,
  addDays,
  formatMonthDay,
  formatWeekRange,
  getWeekdayName,
  isToday,
} from '../lib/bentoDate';
import { toast } from '../store/feedbackStore';
import { Palette } from '../constants/theme';
import type { Recipe } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const AddToMealPlanModal: React.FC = () => {
  const targetRecipe = useMealPlanSheetStore((s) => s.targetRecipe);
  const closeSheet = useMealPlanSheetStore((s) => s.closeSheet);
  const session = useMealPlanSheetStore((s) => s.session);

  if (!targetRecipe) return null;

  return (
    <BottomSheetModal
      visible
      onClose={closeSheet}
      sheetStyle={styles.sheetContainer}
    >
      <MealPlanSheetContent
        key={`${targetRecipe.id}-${session}`}
        recipe={targetRecipe}
        onClose={closeSheet}
      />
    </BottomSheetModal>
  );
};

interface MealPlanSheetContentProps {
  recipe: Recipe;
  onClose: () => void;
}

const MealPlanSheetContent: React.FC<MealPlanSheetContentProps> = ({
  recipe,
  onClose,
}) => {
  const {
    getDayBento,
    addDishesToMeal,
    applyLunchBentoToWorkdays,
  } = useBentoStore();

  const todayStr = getTodayString();
  const currentMondayStr = getMondayOf(todayStr);

  const [weekMonday, setWeekMonday] = useState<string>(currentMondayStr);
  const weekDates = useMemo(() => getWeekDates(weekMonday), [weekMonday]);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const isCurrentWeek = weekMonday === currentMondayStr;
  const isNextWeek = weekMonday === addDays(currentMondayStr, 7);

  const currentDayBento = getDayBento(selectedDate);

  const handleWeekChange = (offset: number) => {
    const nextMonday = addDays(weekMonday, offset * 7);
    const nextDates = getWeekDates(nextMonday);
    const currentIndex = weekDates.indexOf(selectedDate);
    setWeekMonday(nextMonday);
    setSelectedDate(nextDates[currentIndex >= 0 ? currentIndex : 0]);
  };

  const handleBackToCurrentWeek = () => {
    setWeekMonday(getMondayOf(getTodayString()));
    setSelectedDate(getTodayString());
  };

  const handleSelectSlot = (slotKey: MealType, slotLabel: string) => {
    addDishesToMeal(selectedDate, slotKey, [recipe.id]);
    const dayLabel = `${formatMonthDay(selectedDate)} ${getWeekdayName(selectedDate)}`;
    onClose();
    toast({
      type: 'success',
      message: `已将「${recipe.name}」排入【${dayLabel} ${slotLabel}】`,
    });
  };

  const handleApplyWorkdayLunch = () => {
    applyLunchBentoToWorkdays(weekMonday, recipe.id);
    const weekLabel = isCurrentWeek
      ? '本周'
      : isNextWeek
      ? '下周'
      : `${formatWeekRange(weekMonday)} `;
    onClose();
    toast({
      type: 'success',
      message: `已将「${recipe.name}」排入${weekLabel}周一至周五午餐便当`,
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
      color: Palette.sage,
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
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* 顶部标题与关闭 */}
      <View style={styles.sheetHeader}>
        <View style={styles.headerLeft}>
          <CalendarDays size={18} color={Palette.cocoa[900]} />
          <Text style={styles.sheetTitle}>一键排入便当盒</Text>
        </View>
        <Pressable
          onPress={onClose}
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
            coverImage={recipe.coverImage}
            name={recipe.name}
            category={recipe.category}
          />
        </View>
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeName} numberOfLines={1}>
            {recipe.name}
          </Text>
          <View style={styles.recipeMetaRow}>
            <View style={styles.metaTag}>
              <Clock size={11} color={Palette.cocoa[400]} />
              <Text style={styles.metaText}>{recipe.cookTime}分钟</Text>
            </View>
            <View style={styles.metaTag}>
              <Utensils size={11} color={Palette.cocoa[400]} />
              <Text style={styles.metaText}>
                {recipe.ingredients?.length || 0} 种食材
              </Text>
            </View>
            <Text style={styles.categoryText}>{recipe.category}</Text>
          </View>
        </View>
      </View>

      {/* 1. 选择安排日期（支持本周 / 下周 / 任意周切换） */}
      <View style={styles.sectionLabelRow}>
        <Text style={styles.sectionLabel}>选择排入日期</Text>
        {!isCurrentWeek && (
          <Pressable onPress={handleBackToCurrentWeek} hitSlop={8}>
            <Text style={styles.backThisWeekText}>回到本周</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.weekNavRow}>
        <Pressable
          style={styles.weekArrowBtn}
          onPress={() => handleWeekChange(-1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={17} color={Palette.cocoa[700]} />
        </Pressable>

        <View style={styles.weekLabelBox}>
          <CalendarDays size={13} color={Palette.primary} />
          <Text style={styles.weekRangeText}>{formatWeekRange(weekMonday)}</Text>
          <View style={[styles.weekBadge, !isCurrentWeek && styles.weekBadgeActive]}>
            <Text
              style={[
                styles.weekBadgeText,
                !isCurrentWeek && styles.weekBadgeTextActive,
              ]}
            >
              {isCurrentWeek ? '本周' : isNextWeek ? '下周' : '切周'}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.weekArrowBtn}
          onPress={() => handleWeekChange(1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronRight size={17} color={Palette.cocoa[700]} />
        </Pressable>
      </View>

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

      {/* 快捷方式：周一至五午餐（跟随当前所选周） */}
      <Pressable
        style={styles.workdayShortcut}
        onPress={handleApplyWorkdayLunch}
      >
        <Sparkles size={15} color={Palette.primary} />
        <Text style={styles.workdayShortcutText}>
          上班族快捷：一键排入
          {isCurrentWeek ? '本周' : isNextWeek ? '下周' : '所选周'}
          周一至周五午餐带饭
        </Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    paddingBottom: 28,
  },
  scrollArea: {
    maxHeight: SCREEN_HEIGHT * 0.82,
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
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backThisWeekText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
    marginBottom: 8,
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  weekArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Palette.oat[50],
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabelBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  weekRangeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  weekBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Palette.oat[100],
  },
  weekBadgeActive: {
    backgroundColor: Palette.primarySoft,
  },
  weekBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.cocoa[700],
  },
  weekBadgeTextActive: {
    color: Palette.primary,
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
