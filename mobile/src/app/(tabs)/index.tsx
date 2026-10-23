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
import { Search, Heart, Sparkles, ChefHat, Calendar, ChevronRight, ShoppingCart } from 'lucide-react-native';
import { useAllRecipes, getCategoriesWithCounts } from '@/lib/recipes';
import { RecipeCard } from '@/components/RecipeCard';
import { useBentoStore } from '@/store/bentoStore';
import { getTodayString, formatMonthDay, getWeekdayName } from '@/lib/bentoDate';
import { buildGroceryList } from '@/lib/grocery';
import { Palette } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const allRecipes = useAllRecipes();
  const categories = getCategoriesWithCounts(allRecipes);
  const recipeMap = React.useMemo(() => new Map(allRecipes.map((r) => [r.id, r])), [allRecipes]);

  const todayStr = getTodayString();
  const { getDayBento, bentoByDate } = useBentoStore();
  const todayBento = getDayBento(todayStr);

  const groceryToday = React.useMemo(
    () => buildGroceryList([todayStr], bentoByDate, allRecipes).todayItems,
    [todayStr, bentoByDate, allRecipes]
  );

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

  // 今日三餐便当列表
  const todayMeals = [
    { label: '早', items: todayBento.breakfast },
    { label: '午', items: todayBento.lunch },
    { label: '晚', items: todayBento.dinner },
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

        {/* 今日便当盒小卡片 */}
        <TouchableOpacity
          style={styles.planCard}
          onPress={() => router.push('/weekly-plan')}
          activeOpacity={0.88}
        >
          <View style={styles.planCardHeader}>
            <View style={styles.planCardTitleRow}>
              <Calendar size={14} color={Palette.primary} />
              <Text style={styles.planCardTitle}>
                今日便当盒 ({formatMonthDay(todayStr)} {getWeekdayName(todayStr)})
              </Text>
            </View>
            <View style={styles.planCardAction}>
              <Text style={styles.planCardActionText}>一周便当</Text>
              <ChevronRight size={13} color={Palette.cocoa[400]} />
            </View>
          </View>

          <View style={styles.mealSlotsRow}>
            {todayMeals.map((m, idx) => {
              const dishNames = m.items
                .map((item) => recipeMap.get(item.recipeId)?.name)
                .filter(Boolean);
              return (
                <View key={idx} style={styles.mealSlot}>
                  <Text style={styles.mealSlotTag}>{m.label}</Text>
                  <Text style={styles.mealSlotName} numberOfLines={1}>
                    {dishNames.length > 0 ? dishNames.join('、') : '未安排'}
                  </Text>
                </View>
              );
            })}
          </View>

          {groceryToday.length > 0 && (
            <View style={styles.groceryNoticeBar}>
              <ShoppingCart size={13} color={Palette.primary} />
              <Text style={styles.groceryNoticeText} numberOfLines={1}>
                今日急需备菜：{groceryToday.map((i) => i.name).slice(0, 3).join('、')}等 {groceryToday.length} 项食材
              </Text>
            </View>
          )}
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
    paddingTop: 12,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: Palette.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
    zIndex: 10,
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
  groceryNoticeBar: {
    marginTop: 8,
    backgroundColor: 'rgba(217, 107, 56, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  groceryNoticeText: {
    fontSize: 10,
    color: Palette.primary,
    fontWeight: '600',
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
