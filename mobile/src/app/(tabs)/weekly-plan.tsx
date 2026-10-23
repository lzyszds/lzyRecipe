import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Sparkles,
  Trash2,
  CheckCircle2,
  Circle,
  Plus,
  RefreshCw,
  ChevronRight,
  Utensils,
} from 'lucide-react-native';
import { useWeeklyPlanStore, MealSlot } from '@/store/weeklyPlanStore';
import { useAllRecipes } from '@/lib/recipes';
import { RecipeImage } from '@/components/RecipeImage';
import { Palette } from '@/constants/theme';

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const MEAL_CONFIG: { key: MealSlot; label: string; icon: string }[] = [
  { key: 'breakfast', label: '早餐', icon: '🍳' },
  { key: 'lunch', label: '午餐', icon: '🍱' },
  { key: 'dinner', label: '晚餐', icon: '🍲' },
];

export default function WeeklyPlanScreen() {
  const router = useRouter();
  const allRecipes = useAllRecipes();
  const {
    plans,
    assignRecipe,
    clearMeal,
    clearPlan,
    toggleCompleted,
    smartShuffleFill,
  } = useWeeklyPlanStore();

  // 默认选中今天 (0~6)
  const jsDay = new Date().getDay();
  const initialDayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(initialDayIndex);

  const currentDayPlan = plans.find((p) => p.dayIndex === selectedDayIndex);

  const handleSmartFill = () => {
    Alert.alert(
      '智能生成周菜单',
      '将根据菜系和营养搭配，为你一键智能填满这周的三餐，是否继续？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '立即生成',
          onPress: () => smartShuffleFill(allRecipes),
        },
      ]
    );
  };

  const handleClear = () => {
    Alert.alert('清空计划', '确定清空本周的所有安排吗？', [
      { text: '取消', style: 'cancel' },
      { text: '清空', style: 'destructive', onPress: clearPlan },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 头部标题与操作 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>本周餐盘计划</Text>
          <Text style={styles.headerSubtitle}>科学搭配，告别每天“吃什么”的烦恼</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={handleSmartFill}
            activeOpacity={0.8}
          >
            <Sparkles size={14} color="#FFFFFF" />
            <Text style={styles.actionBtnPrimaryText}>智能排餐</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnIcon}
            onPress={handleClear}
            activeOpacity={0.8}
          >
            <Trash2 size={16} color={Palette.cocoa[400]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 星期横滑选择器 */}
      <View style={styles.weekSelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekSelector}
        >
          {WEEK_DAYS.map((dayName, index) => {
            const isSelected = selectedDayIndex === index;
            const isToday = initialDayIndex === index;
            const dayPlan = plans.find((p) => p.dayIndex === index);
            const count = [dayPlan?.breakfast, dayPlan?.lunch, dayPlan?.dinner].filter(
              (m) => m?.recipeId
            ).length;

            return (
              <TouchableOpacity
                key={index}
                style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                onPress={() => setSelectedDayIndex(index)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>
                  {dayName}
                </Text>
                {isToday && (
                  <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} />
                )}
                <Text style={[styles.dayCount, isSelected && styles.dayCountSelected]}>
                  {count > 0 ? `${count}/3` : '未排'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 当天三餐详情 */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>
            {WEEK_DAYS[selectedDayIndex]}的美食安排
          </Text>
        </View>

        {MEAL_CONFIG.map(({ key, label, icon }) => {
          const mealEntry = currentDayPlan ? currentDayPlan[key] : null;
          const recipe = mealEntry?.recipeId
            ? allRecipes.find((r) => r.id === mealEntry.recipeId)
            : null;
          const isDone = mealEntry?.completed || false;

          return (
            <View key={key} style={styles.mealCard}>
              <View style={styles.mealCardHeader}>
                <View style={styles.mealTitleRow}>
                  <Text style={styles.mealEmoji}>{icon}</Text>
                  <Text style={styles.mealLabel}>{label}</Text>
                </View>

                {recipe && (
                  <View style={styles.mealControls}>
                    <TouchableOpacity
                      style={styles.checkBtn}
                      onPress={() => toggleCompleted(selectedDayIndex, key)}
                    >
                      {isDone ? (
                        <CheckCircle2 size={18} color={Palette.apricot[500]} />
                      ) : (
                        <Circle size={18} color={Palette.cocoa[200]} />
                      )}
                      <Text style={[styles.checkText, isDone && styles.checkTextDone]}>
                        {isDone ? '已完成' : '打勾'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => clearMeal(selectedDayIndex, key)}
                    >
                      <Trash2 size={14} color={Palette.cocoa[400]} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {recipe ? (
                <TouchableOpacity
                  style={[styles.recipeRow, isDone && styles.recipeRowDone]}
                  onPress={() =>
                    router.push({
                      pathname: '/recipe/[id]',
                      params: { id: recipe.id },
                    })
                  }
                  activeOpacity={0.85}
                >
                  <View style={styles.recipeThumb}>
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
                    <Text style={styles.recipeMeta}>
                      {recipe.category} · {recipe.cookTime}分钟
                    </Text>
                  </View>

                  <ChevronRight size={16} color={Palette.cocoa[400]} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptyMealSlot}
                  onPress={() => router.push('/recipes')}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color={Palette.apricot[500]} />
                  <Text style={styles.emptyMealText}>去挑选这餐的美食</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.oat[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
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
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.apricot[500],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 5,
  },
  actionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.oat[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekSelectorContainer: {
    paddingVertical: 6,
  },
  weekSelector: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayCard: {
    width: 54,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.oat[200],
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  dayCardSelected: {
    backgroundColor: Palette.apricot[500],
    borderColor: Palette.apricot[500],
  },
  dayName: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.apricot[500],
  },
  todayDotSelected: {
    backgroundColor: '#FFFFFF',
  },
  dayCount: {
    fontSize: 10,
    color: Palette.cocoa[400],
  },
  dayCountSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  dayHeader: {
    marginBottom: 4,
  },
  dayTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.oat[100],
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealEmoji: {
    fontSize: 14,
  },
  mealLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  mealControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkText: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  checkTextDone: {
    color: Palette.apricot[500],
    fontWeight: '600',
  },
  removeBtn: {
    padding: 4,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.oat[50],
    borderRadius: 10,
    padding: 8,
    gap: 10,
  },
  recipeRowDone: {
    opacity: 0.6,
  },
  recipeThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Palette.oat[100],
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  recipeMeta: {
    fontSize: 10,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  emptyMealSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.apricot[50],
    borderWidth: 1,
    borderColor: Palette.apricot[100],
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 6,
  },
  emptyMealText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.apricot[600],
  },
});
