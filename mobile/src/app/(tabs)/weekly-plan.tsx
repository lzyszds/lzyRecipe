import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { confirm, toast } from '@/store/feedbackStore';
import {
  Sparkles,
  Trash2,
  CheckCircle2,
  Circle,
  Plus,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Share2,
  Calendar,
  Utensils,
  X,
  Sunrise,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useBentoStore, MealType } from '@/store/bentoStore';
import { useAllRecipes } from '@/lib/recipes';
import { RecipeImage } from '@/components/RecipeImage';
import { RecipePoolSheet } from '@/components/RecipePoolSheet';
import { GrocerySheet } from '@/components/GrocerySheet';
import { ClearBentoModal } from '@/components/ClearBentoModal';
import { SmartFillModal } from '@/components/SmartFillModal';
import {
  getTodayString,
  getMondayOf,
  getWeekDates,
  addDays,
  formatMonthDay,
  formatWeekRange,
  getWeekdayName,
  isToday,
} from '@/lib/bentoDate';
import { buildGroceryList, formatGroceryToText } from '@/lib/grocery';
import * as Clipboard from 'expo-clipboard';
import { Palette } from '@/constants/theme';

const MEALS_CONFIG: {
  type: MealType;
  label: string;
  icon: typeof Sunrise;
  hint: string;
}[] = [
    { type: 'breakfast', label: '早餐', icon: Sunrise, hint: '轻食、早点、营养' },
    { type: 'lunch', label: '午餐', icon: Sun, hint: '主食、炒菜、便当' },
    { type: 'dinner', label: '晚餐', icon: Moon, hint: '硬菜、靓汤、时蔬' },
  ];

export default function WeeklyPlanScreen() {
  const router = useRouter();
  const allRecipes = useAllRecipes();
  const recipeMap = useMemo(() => new Map(allRecipes.map((r) => [r.id, r])), [allRecipes]);

  const {
    bentoByDate,
    getDayBento,
    removeDishFromMeal,
    clearMeal,
    clearDay,
    clearWeek,
    toggleEaten,
    smartFillEmptySlots,
    recipePool,
  } = useBentoStore();

  const todayStr = getTodayString();
  const currentWeekMonday = getMondayOf(todayStr);

  const [mondayStr, setMondayStr] = useState<string>(currentWeekMonday);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // 弹窗状态
  const [poolSheetVisible, setPoolSheetVisible] = useState(false);
  const [targetMeal, setTargetMeal] = useState<MealType | null>(null);
  const [grocerySheetVisible, setGrocerySheetVisible] = useState(false);
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [smartFillModalVisible, setSmartFillModalVisible] = useState(false);

  // 本周 7 天
  const weekDates = useMemo(() => getWeekDates(mondayStr), [mondayStr]);

  // 当天便当盒
  const currentBento = getDayBento(selectedDate);

  // 采购单数据
  const groceryData = useMemo(
    () => buildGroceryList(weekDates, bentoByDate, allRecipes),
    [weekDates, bentoByDate, allRecipes]
  );

  // 翻周
  const handlePrevWeek = () => {
    const prev = addDays(mondayStr, -7);
    setMondayStr(prev);
    setSelectedDate(prev);
  };

  const handleNextWeek = () => {
    const next = addDays(mondayStr, 7);
    setMondayStr(next);
    setSelectedDate(next);
  };

  const handleThisWeek = () => {
    setMondayStr(currentWeekMonday);
    setSelectedDate(todayStr);
  };

  // 智能填充弹窗呼出
  const handleSmartFill = () => {
    setSmartFillModalVisible(true);
  };

  // 清空便当弹窗呼出
  const handleOpenClearModal = () => {
    setClearModalVisible(true);
  };

  // 确认清空当日
  const handleConfirmClearDay = async () => {
    const ok = await confirm({
      title: '清空当日便当',
      message: `确定要清空 ${formatMonthDay(selectedDate)} (${getWeekdayName(selectedDate)}) 的全部早中晚餐吗？`,
      confirmText: '确定清空',
      destructive: true,
      icon: 'trash',
    });
    if (ok) {
      clearDay(selectedDate);
      toast({ type: 'success', message: '已清空当日便当' });
    }
  };

  // 确认清空整周
  const handleConfirmClearWeek = async () => {
    const ok = await confirm({
      title: '清空本周便当',
      message: `确定要清空 ${formatWeekRange(mondayStr)} 整周 7 天的全部便当排餐吗？此操作不可逆。`,
      confirmText: '确定清空整周',
      destructive: true,
      icon: 'trash',
    });
    if (ok) {
      clearWeek(mondayStr);
      toast({ type: 'success', message: '已清空本周所有便当安排' });
    }
  };

  // 一键复制采购单
  const handleQuickCopyGrocery = async () => {
    if (groceryData.totalCount === 0) {
      toast({ type: 'info', message: '采购清单为空，先给便当盒加几道菜吧！' });
      return;
    }
    const text = formatGroceryToText(
      mondayStr,
      groceryData.todayItems,
      groceryData.weekItems
    );
    await Clipboard.setStringAsync(text);
    toast({
      type: 'success',
      message: '采购清单已复制，可直接发微信给家人！',
    });
  };

  const openAddDishSheet = (meal: MealType) => {
    setTargetMeal(meal);
    setPoolSheetVisible(true);
  };

  const isCurrentWeek = mondayStr === currentWeekMonday;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 1. 顶部置顶微信风格导航栏 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>一周便当盒</Text>
          <Text style={styles.headerSubtitle}>把想吃的菜放进便当，认真过好每一天</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.smartFillBtn}
            onPress={handleSmartFill}
            activeOpacity={0.8}
          >
            <Sparkles size={13} color="#FFFFFF" />
            <Text style={styles.smartFillBtnText}>智能填充</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleOpenClearModal}
            activeOpacity={0.8}
          >
            <Trash2 size={16} color={Palette.cocoa[400]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. 周区间切换条 */}
      <View style={styles.weekNav}>
        <TouchableOpacity
          style={styles.weekArrowBtn}
          onPress={handlePrevWeek}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color={Palette.cocoa[700]} />
        </TouchableOpacity>

        <View style={styles.weekLabelBox}>
          <Calendar size={14} color={Palette.primary} />
          <Text style={styles.weekRangeText}>{formatWeekRange(mondayStr)}</Text>
          {!isCurrentWeek && (
            <TouchableOpacity style={styles.todayBadge} onPress={handleThisWeek}>
              <Text style={styles.todayBadgeText}>回本周</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.weekArrowBtn}
          onPress={handleNextWeek}
          activeOpacity={0.7}
        >
          <ChevronRight size={18} color={Palette.cocoa[700]} />
        </TouchableOpacity>
      </View>

      {/* 3. 7天横向便当格选择器 */}
      <View style={styles.daysScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysScroll}
        >
          {weekDates.map((dateStr) => {
            const isSelected = selectedDate === dateStr;
            const today = isToday(dateStr);
            const dayBento = getDayBento(dateStr);
            const totalDishes =
              dayBento.breakfast.length +
              dayBento.lunch.length +
              dayBento.dinner.length;

            return (
              <TouchableOpacity
                key={dateStr}
                style={[
                  styles.dayChip,
                  isSelected && styles.dayChipSelected,
                  today && !isSelected && styles.dayChipTodayBorder,
                ]}
                onPress={() => setSelectedDate(dateStr)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dayWeekday,
                    isSelected && styles.dayTextSelected,
                    today && !isSelected && styles.dayWeekdayToday,
                  ]}
                >
                  {getWeekdayName(dateStr)}
                </Text>

                <Text
                  style={[
                    styles.dayDate,
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {formatMonthDay(dateStr)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. 当天便当盒主视图 (三餐卡片) */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bentoHeaderRow}>
          <View style={styles.bentoTitleGroup}>
            <Text style={styles.bentoDayTitle}>
              {formatMonthDay(selectedDate)} {getWeekdayName(selectedDate)} 的便当盒
            </Text>
            {isToday(selectedDate) && (
              <View style={styles.todayPill}>
                <Text style={styles.todayPillText}>今日便当</Text>
              </View>
            )}
          </View>

          {recipePool.length > 0 && (
            <Text style={styles.poolHintText}>
              候选池有 <Text style={{ color: Palette.primary, fontWeight: '700' }}>{recipePool.length}</Text> 道备选
            </Text>
          )}
        </View>

        {/* 早、中、晚三格便当 */}
        {MEALS_CONFIG.map(({ type, label, icon: MealIcon, hint }) => {
          const items = currentBento[type] || [];
          return (
            <View key={type} style={styles.mealSlotCard}>
              <View style={styles.mealSlotHeader}>
                <View style={styles.mealTitleRow}>
                  <MealIcon size={16} color={Palette.primary} />
                  <Text style={styles.mealTitle}>{label}</Text>
                  <Text style={styles.mealHint}>({items.length}道)</Text>
                </View>

                <TouchableOpacity
                  style={styles.addDishBtn}
                  onPress={() => openAddDishSheet(type)}
                  activeOpacity={0.8}
                >
                  <Plus size={13} color={Palette.primary} strokeWidth={2.5} />
                  <Text style={styles.addDishBtnText}>从菜池加菜</Text>
                </TouchableOpacity>
              </View>

              {items.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptyMealBox}
                  onPress={() => openAddDishSheet(type)}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={Palette.cocoa[400]} />
                  <Text style={styles.emptyMealText}>
                    点击挑选想吃的{label}（支持多菜组合）
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.dishesList}>
                  {items.map((item) => {
                    const dish = recipeMap.get(item.recipeId);
                    if (!dish) return null;
                    const isEaten = Boolean(item.eatenAt);

                    return (
                      <View
                        key={item.recipeId}
                        style={[styles.dishItem, isEaten && styles.dishItemEaten]}
                      >
                        <TouchableOpacity
                          style={styles.eatenBtn}
                          onPress={() => {
                            toggleEaten(selectedDate, type, item.recipeId);
                            toast({
                              type: isEaten ? 'info' : 'success',
                              message: isEaten
                                ? `已取消「${dish.name}」打卡`
                                : `已打卡吃掉「${dish.name}」`,
                            });
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          {isEaten ? (
                            <CheckCircle2 size={18} color="#10B981" />
                          ) : (
                            <Circle size={18} color={Palette.cocoa[400]} />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.dishContent}
                          onPress={() =>
                            router.push({
                              pathname: '/recipe/[id]',
                              params: { id: dish.id },
                            })
                          }
                          activeOpacity={0.8}
                        >
                          <View style={styles.dishThumb}>
                            <RecipeImage
                              coverImage={dish.coverImage}
                              name={dish.name}
                              category={dish.category}
                            />
                          </View>

                          <View style={styles.dishMetaCol}>
                            <Text
                              style={[
                                styles.dishName,
                                isEaten && styles.dishNameEaten,
                              ]}
                              numberOfLines={1}
                            >
                              {dish.name}
                            </Text>
                            <Text style={styles.dishSubtext}>
                              {dish.category} · {dish.cookTime}分钟
                              {isEaten && ' · 已吃掉'}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeDishBtn}
                          onPress={() =>
                            removeDishFromMeal(selectedDate, type, item.recipeId)
                          }
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={15} color={Palette.cocoa[400]} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* 5. 底部悬浮采购条（一键复制与查看清单） */}
      <View style={styles.bottomBarWrapper}>
        <TouchableOpacity
          style={styles.groceryBar}
          onPress={() => setGrocerySheetVisible(true)}
          activeOpacity={0.9}
        >
          <View style={styles.groceryBarLeft}>
            <View style={styles.cartIconCircle}>
              <ShoppingCart size={15} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.groceryBarTitle}>
                本周采购 <Text style={{ color: Palette.primary, fontWeight: '800' }}>{groceryData.totalCount}</Text> 项食材
              </Text>
              <Text style={styles.groceryBarSubtitle}>
                今天急需 {groceryData.todayItems.length} 项 · 点此查清单
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.quickCopyBtn}
            onPress={(e) => {
              e.stopPropagation();
              handleQuickCopyGrocery();
            }}
            activeOpacity={0.8}
          >
            <Share2 size={13} color={Palette.primary} />
            <Text style={styles.quickCopyBtnText}>复制给家人</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      {/* 6. 从候选菜池放入餐位弹窗 */}
      <RecipePoolSheet
        visible={poolSheetVisible}
        targetDate={selectedDate}
        targetMeal={targetMeal}
        onClose={() => {
          setPoolSheetVisible(false);
          setTargetMeal(null);
        }}
      />

      {/* 7. 采购单详细清单弹窗 */}
      <GrocerySheet
        visible={grocerySheetVisible}
        mondayStr={mondayStr}
        weekDates={weekDates}
        onClose={() => setGrocerySheetVisible(false)}
      />

      {/* 8. 便当清空选项弹窗（支持当日与整周） */}
      <ClearBentoModal
        visible={clearModalVisible}
        onClose={() => setClearModalVisible(false)}
        selectedDate={selectedDate}
        mondayStr={mondayStr}
        onClearDay={handleConfirmClearDay}
        onClearWeek={handleConfirmClearWeek}
      />

      {/* 9. AI 智能配餐填补弹窗（支持自然语言诉求与范围） */}
      <SmartFillModal
        visible={smartFillModalVisible}
        onClose={() => setSmartFillModalVisible(false)}
        selectedDate={selectedDate}
        mondayStr={mondayStr}
        weekDates={weekDates}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: Palette.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  headerSubtitle: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smartFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 5,
  },
  smartFillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Palette.canvas,
  },
  weekArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.dockBorder,
  },
  weekLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekRangeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  todayBadge: {
    backgroundColor: 'rgba(217, 107, 56, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.primary,
  },
  daysScrollWrapper: {
    backgroundColor: Palette.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
    paddingBottom: 10,
  },
  daysScroll: {
    paddingHorizontal: 16,
    gap: 3,
    marginTop: 12
  },
  dayChip: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayChipSelected: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  dayChipTodayBorder: {
    borderColor: Palette.primary,
  },
  dayWeekday: {
    fontSize: 11,
    color: Palette.cocoa[400],
    fontWeight: '600',
  },
  dayWeekdayToday: {
    color: Palette.primary,
    fontWeight: '700',
  },
  dayDate: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dishCountBadge: {
    backgroundColor: Palette.oat[100],
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
  },
  dishCountBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  dishCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: Palette.cocoa[700],
  },
  dishCountTextSelected: {
    color: '#FFFFFF',
  },
  emptySlotDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.dockBorder,
  },
  container: {
    flex: 1,
    backgroundColor: Palette.oat[50],
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120, // 为底部采购条预留位置
    gap: 12,
  },
  bentoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  bentoTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bentoDayTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  todayPill: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  poolHintText: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  mealSlotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    gap: 10,
  },
  mealSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealIcon: {
    fontSize: 16,
  },
  mealTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  mealHint: {
    fontSize: 12,
    color: Palette.cocoa[400],
  },
  addDishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 107, 56, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  addDishBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  emptyMealBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 18,
    gap: 6,
    backgroundColor: Palette.oat[50],
  },
  emptyMealText: {
    fontSize: 12,
    color: Palette.cocoa[400],
    fontWeight: '500',
  },
  dishesList: {
    gap: 8,
  },
  dishItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.oat[50],
    borderRadius: 12,
    padding: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: Palette.oat[100],
  },
  dishItemEaten: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  eatenBtn: {
    paddingLeft: 4,
  },
  dishContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dishThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Palette.oat[100],
  },
  dishMetaCol: {
    flex: 1,
  },
  dishName: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  dishNameEaten: {
    textDecorationLine: 'line-through',
    color: Palette.cocoa[400],
  },
  dishSubtext: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  removeDishBtn: {
    padding: 6,
  },
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  groceryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(217, 107, 56, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  groceryBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groceryBarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  groceryBarSubtitle: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 1,
  },
  quickCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 107, 56, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  quickCopyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
});
