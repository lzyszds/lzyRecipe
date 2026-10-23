import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Heart, Sparkles, ChefHat, Calendar, ChevronRight } from 'lucide-react-native';
import { useAllRecipes, getCategoriesWithCounts } from '@/lib/recipes';
import { RecipeCard } from '@/components/RecipeCard';
import { useWeeklyPlanStore } from '@/store/weeklyPlanStore';
import { Palette } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const allRecipes = useAllRecipes();
  const categories = getCategoriesWithCounts(allRecipes);
  const { plans } = useWeeklyPlanStore();

  // 今日是星期几 (0:周日, 1:周一...) 映射到 0~6
  const jsDay = new Date().getDay();
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const todayPlan = plans.find((p) => p.dayIndex === todayIndex);

  // 精选菜谱
  const FEATURED_NAMES = [
    '芥末黄油罗氏虾',
    '小炒黄牛肉',
    '油焖大虾',
    '凉拌肥牛',
    '水煮鱼',
    '咖喱虾鸡堡',
    '红烧肉',
    '西红柿炒鸡蛋',
  ];
  const featured = FEATURED_NAMES.map((name) =>
    allRecipes.find((r) => r.name.trim() === name)
  ).filter((r): r is NonNullable<typeof r> => Boolean(r));
  const displayRecipes = featured.length > 0 ? featured : allRecipes.slice(0, 8);

  // 今日餐盘统计
  const todayMeals = [
    { label: '早', item: todayPlan?.breakfast },
    { label: '午', item: todayPlan?.lunch },
    { label: '晚', item: todayPlan?.dinner },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 顶部 Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.logoBadge}>
            <ChefHat size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.appTitle}>志得食谱</Text>
            <Text style={styles.appSubtitle}>今天想吃什么？认真吃好每一餐</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.favBadge}
          onPress={() => router.push('/favorites')}
          activeOpacity={0.8}
        >
          <Heart size={16} color={Palette.apricot[500]} fill={Palette.apricot[100]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 搜索框触发按钮 */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/search')}
          activeOpacity={0.8}
        >
          <Search size={16} color={Palette.cocoa[400]} />
          <Text style={styles.searchPlaceholder}>搜索菜名、食材、菜系...</Text>
        </TouchableOpacity>

        {/* 今日餐盘小卡片 */}
        <TouchableOpacity
          style={styles.planCard}
          onPress={() => router.push('/weekly-plan')}
          activeOpacity={0.88}
        >
          <View style={styles.planCardHeader}>
            <View style={styles.planCardTitleRow}>
              <Calendar size={14} color={Palette.apricot[500]} />
              <Text style={styles.planCardTitle}>今日餐盘计划</Text>
            </View>
            <View style={styles.planCardAction}>
              <Text style={styles.planCardActionText}>周计划</Text>
              <ChevronRight size={13} color={Palette.cocoa[400]} />
            </View>
          </View>

          <View style={styles.mealSlotsRow}>
            {todayMeals.map((m, idx) => {
              const recipe = m.item?.recipeId
                ? allRecipes.find((r) => r.id === m.item?.recipeId)
                : null;
              return (
                <View key={idx} style={styles.mealSlot}>
                  <Text style={styles.mealSlotTag}>{m.label}</Text>
                  <Text style={styles.mealSlotName} numberOfLines={1}>
                    {recipe ? recipe.name : '未安排'}
                  </Text>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>
        {/* 精选菜谱网格 */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Sparkles size={14} color={Palette.apricot[500]} />
            <Text style={styles.sectionTitle}>精选美味</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/recipes')}>
            <Text style={styles.sectionLink}>共 {allRecipes.length} 道 →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {displayRecipes.map((recipe) => (
            <View key={recipe.id} style={styles.gridItem}>
              <RecipeCard recipe={recipe} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.oat[50],
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Palette.apricot[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Palette.apricot[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  appSubtitle: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 1,
  },
  favBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.oat[100],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Palette.cocoa[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.oat[200],
    paddingHorizontal: 14,
    height: 42,
    gap: 10,
    marginBottom: 14,
    shadowColor: Palette.cocoa[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  searchPlaceholder: {
    fontSize: 12,
    color: Palette.cocoa[400],
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.oat[100],
    marginBottom: 16,
    shadowColor: Palette.cocoa[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  planCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  planCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  planCardActionText: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  mealSlotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealSlot: {
    flex: 1,
    backgroundColor: Palette.oat[50],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealSlotTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.apricot[600],
    backgroundColor: Palette.apricot[100],
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  mealSlotName: {
    fontSize: 11,
    color: Palette.cocoa[700],
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  sectionLink: {
    fontSize: 11,
    fontWeight: '500',
    color: Palette.cocoa[400],
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.oat[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  categoryIcon: {
    fontSize: 13,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[900],
  },
  categoryCount: {
    fontSize: 10,
    color: Palette.cocoa[400],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    flexGrow: 1,
  },
});
