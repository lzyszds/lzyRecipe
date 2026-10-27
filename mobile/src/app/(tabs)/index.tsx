import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  Plus,
  Sparkles,
  ChevronRight,
  Heart,
  ChefHat,
  ArrowRight,
  History,
} from 'lucide-react-native';
import { useAllRecipes } from '@/lib/recipes';
import { useMealPlanSheetStore } from '@/store/mealPlanSheetStore';
import { useRecentCookedStore } from '@/store/recentCookedStore';
import { useUiPrefsStore } from '@/store/uiPrefsStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeImage } from '@/components/RecipeImage';
import { HeroCarousel } from '@/components/HeroCarousel';
import { getTodayString, getWeekdayName } from '@/lib/bentoDate';
import { Recipe } from '@/types';
import { Palette } from '@/constants/theme';

/** 首页场景筛选（作用于精选菜谱流） */
const SCENE_FILTERS = [
  { id: 'all', name: '全部' },
  { id: 'fast', name: '快手' },
  { id: 'chuangxiang', name: '川湘' },
  { id: 'seafood', name: '海鲜' },
  { id: 'soup', name: '汤羹' },
  { id: 'comfort', name: '家常' },
];

/** 稳定伪随机数（0~1）：同一 (seed, id) 恒定，跨天/跨菜变化 */
function stableHash(seed: number, id: string): number {
  let h = seed >>> 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

/** 当日种子：精选池按天轮换，同一天内保持稳定 */
function daySeedNow(): number {
  return Math.floor(Date.now() / 86400000);
}

/**
 * 精选算法打分：
 * 内容完整度（步骤/用料/封面/诀窍）+ 收藏加成 + 最近吃过降权（推新）+ 每日轮换扰动
 */
function scoreRecipe(
  recipe: Recipe,
  favoriteIds: Set<string>,
  cookedIds: Set<string>,
  daySeed: number
): number {
  let score = 0;
  score += Math.min((recipe.steps?.length || 0) / 6, 2); // 步骤完整度 0~2
  score += (recipe.ingredients?.length || 0) >= 4 ? 1 : 0; // 用料丰富
  score += recipe.coverImage ? 1 : 0; // 有封面
  score += recipe.tips ? 0.5 : 0; // 有诀窍
  if (favoriteIds.has(recipe.id)) score += 2; // 收藏加成
  if (cookedIds.has(recipe.id)) score -= 2.5; // 最近做过的降权，把位置让给新菜
  score += stableHash(daySeed, recipe.id) * 3; // 每日轮换扰动 0~3
  return score;
}

export default function HomeScreen() {
  const router = useRouter();
  const allRecipes = useAllRecipes();
  const openMealPlanSheet = useMealPlanSheetStore((s) => s.openSheet);
  const recentCooked = useRecentCookedStore((s) => s.recent);
  const clearRecent = useRecentCookedStore((s) => s.clearRecent);
  const favorites = useFavoritesStore((s) => s.favorites);
  const { width: windowWidth } = useWindowDimensions();

  // 场景筛选持久化，回到首页保持上次的选择
  const activeScene = useUiPrefsStore((s) => s.homeScene);
  const setActiveScene = useUiPrefsStore((s) => s.setHomeScene);
  // 计算两列网格宽度
  const columnWidth = useMemo(() => {
    return Math.floor((windowWidth - 32 - 12) / 2);
  }, [windowWidth]);

  const todayStr = getTodayString();
  const weekdayName = getWeekdayName(todayStr);

  // 计算动态问候
  const inspirationSubtitle = useMemo(() => {
    const hour = new Date().getHours();
    const period = hour < 10 ? '早餐' : hour < 14 ? '午餐' : hour < 20 ? '晚餐' : '夜宵';
    return `${weekdayName}${period}灵感 · 拒绝外卖`;
  }, [weekdayName]);

  // 精选算法：全库按综合分排序（当天稳定、每天轮换、收藏加权、吃过降权）
  const scoredRecipes = useMemo(() => {
    const daySeed = daySeedNow();
    const favoriteIds = new Set(favorites);
    const cookedIds = new Set(recentCooked.map((c) => c.recipeId));
    return allRecipes
      .map((r) => ({ recipe: r, score: scoreRecipe(r, favoriteIds, cookedIds, daySeed) }))
      .sort((a, b) => b.score - a.score)
      .map((s) => s.recipe);
  }, [allRecipes, favorites, recentCooked]);

  // 今日主厨推荐轮播数据（组件内部自管动画与手势，memo 隔离避免整页重渲染）
  const heroSlides = useMemo(() => scoredRecipes.slice(0, 5), [scoredRecipes]);

  // 最近点过的菜：仅统计便当盒里打卡「已吃掉」（完成）的菜谱，按完成时间倒序，自动过滤已删除菜谱
  const recentRecipes = useMemo(() => {
    const recipeMap = new Map(allRecipes.map((recipe) => [recipe.id, recipe]));
    return recentCooked
      .map((item) => recipeMap.get(item.recipeId))
      .filter((recipe): recipe is Recipe => Boolean(recipe))
      .slice(0, 10);
  }, [recentCooked, allRecipes]);

  // 场景/分类过滤后的双列菜谱流（场景筛选基于新标签体系，按精选算法排序）
  const feedRecipes = useMemo(() => {
    const rank = new Map(scoredRecipes.map((r, i) => [r.id, i]));
    const top = (list: Recipe[], n: number) =>
      [...list]
        .sort(
          (a, b) =>
            (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        )
        .slice(0, n);

    if (activeScene === 'fast') {
      return top(
        allRecipes.filter((r) => r.tags?.includes('快手菜') || (r.cookTime || 30) <= 20),
        10
      );
    }
    if (activeScene === 'chuangxiang') {
      return top(allRecipes.filter((r) => r.category === '川菜' || r.category === '湘菜'), 10);
    }
    if (activeScene === 'seafood') {
      return top(allRecipes.filter((r) => r.tags?.includes('海鲜')), 10);
    }
    if (activeScene === 'soup') {
      return top(allRecipes.filter((r) => r.category === '汤羹'), 10);
    }
    if (activeScene === 'comfort') {
      return top(allRecipes.filter((r) => r.category === '家常菜'), 10);
    }
    // all: 精选算法综合分前 12 道（每天轮换一批）
    return scoredRecipes.slice(0, 12);
  }, [activeScene, allRecipes, scoredRecipes]);

  const handleOpenRecipe = useCallback((recipe: Recipe) => {
    router.push({
      pathname: '/recipe/[id]',
      params: { id: recipe.id },
    });
  }, [router]);

  const handleAddToPlan = useCallback((e: any, recipe: Recipe) => {
    e?.stopPropagation?.();
    openMealPlanSheet(recipe);
  }, [openMealPlanSheet]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 
        1. 顶部固定导航与搜索栏 (Native App Header, 独立在 ScrollView 之外，永久固定在顶部不随页面滚动消失)
      */}
      <View style={styles.fixedHeader}>
        {/* 品牌行与快捷入口 */}
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <ChefHat size={16} color="#FFFFFF" strokeWidth={2.4} />
            </View>
            <View style={styles.brandTextWrap}>
              <View style={styles.brandTitleRow}>
                <Text style={styles.brandTitle}>食刻</Text>
                <View style={styles.periodPill}>
                  <Text style={styles.periodPillText}>{inspirationSubtitle}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => router.push('/favorites')}
              activeOpacity={0.75}
              accessibilityLabel="我的收藏"
            >
              <Heart size={18} color={Palette.cocoa[700]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 移动端搜索胶囊 (点击直达搜索，常驻顶端极速触达) */}
        <TouchableOpacity
          style={styles.searchCapsule}
          onPress={() => router.push('/search')}
          activeOpacity={0.85}
        >
          <Search size={15} color={Palette.cocoa[400]} strokeWidth={2.2} />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            搜索菜品、食材（如：排骨、回锅肉、大虾）...
          </Text>
          <View style={styles.searchCapsuleBtn}>
            <Text style={styles.searchCapsuleBtnText}>搜搜</Text>
            <ArrowRight size={11} color={Palette.primary} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 2. 页面主体内容滚动区 */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >

        {/* 今日主厨推荐：折叠卡片堆叠轮播（独立组件，换页不重渲染首页） */}
        <HeroCarousel slides={heroSlides} onOpen={handleOpenRecipe} onAddToPlan={handleAddToPlan} />

        {/* 最近点过：便当盒里打卡「已吃掉」的菜谱，一键回看 */}
        {recentRecipes.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <View style={styles.sectionTitleRow}>
                <History size={16} color={Palette.primary} />
                <Text style={styles.sectionTitle}>最近点过</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{recentRecipes.length}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={clearRecent}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.recentClearText}>清空</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScrollContent}
            >
              {recentRecipes.map((dish) => (
                <TouchableOpacity
                  key={dish.id}
                  style={styles.recentCard}
                  onPress={() => handleOpenRecipe(dish)}
                  activeOpacity={0.86}
                >
                  <View style={styles.recentImageWrap}>
                    <RecipeImage
                      coverImage={dish.coverImage}
                      name={dish.name}
                      category={dish.category}
                    />
                    <TouchableOpacity
                      style={styles.recentAddBtn}
                      onPress={(e) => handleAddToPlan(e, dish)}
                      activeOpacity={0.8}
                      accessibilityLabel={`将${dish.name}排入便当盒`}
                    >
                      <Plus size={13} color={Palette.cocoa[900]} strokeWidth={2.6} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.recentName} numberOfLines={1}>
                    {dish.name}
                  </Text>
                  <Text style={styles.recentMeta} numberOfLines={1}>
                    {dish.cookTime || 0}分钟 · {dish.category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 场景筛选：作用于下方精选菜谱流 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scenesScroll}
          contentContainerStyle={styles.scenesScrollContainer}
        >
          {SCENE_FILTERS.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.scenePill, activeScene === s.id && styles.scenePillActive]}
              onPress={() => setActiveScene(s.id)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.scenePillText,
                  activeScene === s.id && styles.scenePillTextActive,
                ]}
              >
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 灵感菜谱流区域：纯正双列原生瀑布卡片 */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <Sparkles size={16} color="#EA580C" />
            <Text style={styles.sectionTitle}>
             精选菜谱
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{feedRecipes.length}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.sectionMoreBtn}
            onPress={() => router.push('/recipes')}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionMoreText}>查看完整库</Text>
            <ChevronRight size={14} color="#78716C" />
          </TouchableOpacity>
        </View>

        {/* 移动端两列精品卡片流 */}
        <View style={styles.feedGrid}>
          {feedRecipes.map((dish) => (
            <View key={dish.id} style={{ width: columnWidth }}>
              <RecipeCard recipe={dish} />
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
    backgroundColor: Palette.canvas,
  },
  // 顶部常驻固定 Header (不随页面滚动消失)
  fixedHeader: {
    backgroundColor: Palette.canvas,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTextWrap: {
    flex: 1,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.cocoa[900],
    letterSpacing: -0.3,
  },
  periodPill: {
    backgroundColor: Palette.amberSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  periodPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.amberWarm,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 搜索胶囊条
  searchCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: Palette.cocoa[400],
  },
  searchCapsuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.apricot[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 2,
  },
  searchCapsuleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  // 滚动容器
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 170, // 避免被底部 Dock TabBar 遮挡
  },
  // 场景标签横滑
  scenesScroll: {
    marginBottom: 14,
  },
  scenesScrollContainer: {
    gap: 8,
    paddingRight: 8,
  },
  scenePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.dockBorder,
  },
  scenePillActive: {
    backgroundColor: Palette.cocoa[900],
    borderColor: Palette.cocoa[900],
  },
  scenePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  scenePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // 主厨推荐 Hero 卡片
  // 最近点过的菜
  recentSection: {
    marginBottom: 20,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentClearText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.cocoa[400],
  },
  recentScrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  recentCard: {
    width: 104,
  },
  recentImageWrap: {
    width: 104,
    height: 78,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Palette.tagWarm,
    position: 'relative',
  },
  recentAddBtn: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentName: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  recentMeta: {
    marginTop: 2,
    fontSize: 10,
    color: Palette.cocoa[400],
  },
  // 冰箱清库存卡片
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // 灵感推荐双列流区域
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  countBadge: {
    backgroundColor: Palette.amberSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.amberWarm,
  },
  sectionMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionMoreText: {
    fontSize: 12,
    color: Palette.inkMuted,
    fontWeight: '600',
  },
  feedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
