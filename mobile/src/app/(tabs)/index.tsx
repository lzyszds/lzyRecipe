import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Plus,
  Sparkles,
  ChevronRight,
  Heart,
  ArrowRight,
  ArrowUp,
  History,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { useAllRecipes } from '@/lib/recipes';
import { useMealPlanSheetStore } from '@/store/mealPlanSheetStore';
import { useRecentCookedStore } from '@/store/recentCookedStore';
import { useUiPrefsStore } from '@/store/uiPrefsStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useFeedProfileStore } from '@/store/feedProfileStore';
import { createFeedSession, FeedSession } from '@/lib/recommend';
import { useBrandFont } from '@/hooks/useBrandFont';
import { pickHeroSlides } from '@/lib/heroPicks';
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

/** 稳定伪随机数与精选算法已迁移至 lib/heroPicks（与开屏封面预加载共用） */

export default function HomeScreen() {
  const router = useRouter();
  // 品牌字体：站酷快乐体（与开屏一致，全局缓存）
  const brandFontReady = useBrandFont();
  const allRecipes = useAllRecipes();
  const openMealPlanSheet = useMealPlanSheetStore((s) => s.openSheet);
  const recentCooked = useRecentCookedStore((s) => s.recent);
  const clearRecent = useRecentCookedStore((s) => s.clearRecent);
  const favorites = useFavoritesStore((s) => s.favorites);
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // 回到顶部悬浮按钮：滚动超过 600px 出现，一键回到流顶部
  const listRef = useRef<FlatList<Recipe> | null>(null);
  const [showTop, setShowTop] = useState(false);
  const handleFeedScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const next = e.nativeEvent.contentOffset.y > 600;
    setShowTop((prev) => (prev === next ? prev : next));
  }, []);
  const handleScrollTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

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
  const scoredRecipes = useMemo(
    () => pickHeroSlides(allRecipes, favorites, recentCooked),
    [allRecipes, favorites, recentCooked]
  );

  // 今日主厨推荐轮播数据（组件内部自管动画与手势，memo 隔离避免整页重渲染）
  const heroSlides = useMemo(() => scoredRecipes.slice(0, 5), [scoredRecipes]);  // 最近点过的菜：仅统计便当盒里打卡「已吃掉」（完成）的菜谱，按完成时间倒序，自动过滤已删除菜谱
  const recentRecipes = useMemo(() => {
    const recipeMap = new Map(allRecipes.map((recipe) => [recipe.id, recipe]));
    return recentCooked
      .map((item) => recipeMap.get(item.recipeId))
      .filter((recipe): recipe is Recipe => Boolean(recipe))
      .slice(0, 10);
  }, [recentCooked, allRecipes]);

  // 场景/分类过滤后的菜谱流已迁移至推荐会话（见 rebuildFeed / loadMore）

  // 推荐会话：小红书式无限流（会话内逐页加权抽样，越滑越个性化）
  const sessionRef = useRef<FeedSession | null>(null);
  const [feedItems, setFeedItems] = useState<Recipe[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // 会话种子：每次冷启动随机 → 每次进入推荐内容顺序都不同
  const [sessionSeed] = useState(() => Math.floor(Math.random() * 1e9));
  // 每页条数（双列网格对齐）
  const PAGE_SIZE = 12;

  // 信号源用 ref + effect 跟踪：收藏/做过/画像在滑动中途变化不应打断当前信息流
  const allRecipesRef = useRef(allRecipes);
  const favoritesRef = useRef(favorites);
  const recentCookedRef = useRef(recentCooked);
  useEffect(() => {
    allRecipesRef.current = allRecipes;
    favoritesRef.current = favorites;
    recentCookedRef.current = recentCooked;
  }, [allRecipes, favorites, recentCooked]);

  // 场景 → 推荐池过滤器
  const sceneFilter = useCallback(
    (r: Recipe) => {
      switch (activeScene) {
        case 'fast':
          return Boolean(r.tags?.includes('快手菜')) || (r.cookTime || 30) <= 20;
        case 'chuangxiang':
          return r.category === '川菜' || r.category === '湘菜';
        case 'seafood':
          return Boolean(r.tags?.includes('海鲜'));
        case 'soup':
          return r.category === '汤羹';
        case 'comfort':
          return r.category === '家常菜';
        default:
          return true;
      }
    },
    [activeScene]
  );

  /** 重建推荐会话：冷启动 / 切场景 / 下拉刷新 */
  const rebuildFeed = useCallback(
    (showSpinner: boolean) => {
      const profile = useFeedProfileStore.getState();
      sessionRef.current = createFeedSession(
        allRecipesRef.current,
        {
          favorites: favoritesRef.current,
          cookedIds: recentCookedRef.current.map((c) => c.recipeId),
          categoryViews: profile.categoryViews,
          tagViews: profile.tagViews,
        },
        sceneFilter,
        sessionSeed
      );
      setFeedItems(sessionRef.current.next(PAGE_SIZE));
      if (showSpinner) {
        setRefreshing(false);
      }
    },
    [sceneFilter, sessionSeed]
  );

  // 初次挂载 / 切换场景时重建
  useEffect(() => {
    rebuildFeed(false);
  }, [rebuildFeed]);

  /** 上拉加载下一页：池抽干时自动续开新会话，永远有内容可刷 */
  const loadMore = useCallback(() => {
    let session = sessionRef.current;
    if (!session || loadingMore) return;
    if (session.remaining() === 0) {
      // 续期：新种子新会话，已展示菜品强降权优先补新面孔
      const profile = useFeedProfileStore.getState();
      session = createFeedSession(
        allRecipesRef.current,
        {
          favorites: favoritesRef.current,
          cookedIds: recentCookedRef.current.map((c) => c.recipeId),
          categoryViews: profile.categoryViews,
          tagViews: profile.tagViews,
        },
        sceneFilter,
        Math.floor(Math.random() * 1e9),
        feedItems.map((r) => r.id)
      );
      sessionRef.current = session;
    }
    setLoadingMore(true);
    const page = session.next(PAGE_SIZE);
    if (page.length > 0) {
      setFeedItems((prev) => [...prev, ...page]);
    }
    setLoadingMore(false);
  }, [loadingMore, sceneFilter, feedItems]);

  /** 下拉刷新：重开会话拿一批新推荐 */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    rebuildFeed(true);
  }, [rebuildFeed]);

  /** 打开菜谱：画像统一在详情页记录 */
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
            <Image
              source={require('../../../assets/images/093926azcUrjbXBsmEPSSw.png')}
              style={styles.brandMascot}
              contentFit="contain"
            />
            <View style={styles.brandTextWrap}>
              <View style={styles.brandTitleRow}>
                <Text
                  style={[styles.brandTitle, brandFontReady && styles.brandTitleFont]}
                >
                  食刻
                </Text>
                <View style={styles.periodPill}>
                  <Text style={styles.periodPillText}>{inspirationSubtitle}</Text>
                </View>
              </View>
              <Text style={styles.brandSubtitle}>CookMoment</Text>
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

      {/* 2. 页面主体内容滚动区：无限推荐流（拉到底部自动续页） */}
      <FlatList
        ref={listRef}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleFeedScroll}
        scrollEventThrottle={32}
        data={feedItems}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.feedRow}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Palette.primary}
            colors={[Palette.primary]}
          />
        }
        ListHeaderComponent={
          <>
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

            {/* 场景筛选：切换即重开推荐会话 */}
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

            {/* 灵感推荐流区域标题 */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Sparkles size={16} color="#EA580C" />
                <Text style={styles.sectionTitle}>为你推荐</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{feedItems.length}</Text>
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
          </>
        }
        renderItem={({ item }) => (
          <View style={{ width: columnWidth }}>
            <RecipeCard recipe={item} />
          </View>
        )}
        ListFooterComponent={
          feedItems.length === 0 ? (
            <Text style={styles.feedEndText}>暂无符合条件的菜谱</Text>
          ) : (
            <View style={styles.feedLoadingRow}>
              <ActivityIndicator size="small" color={Palette.primary} />
              <Text style={styles.feedLoadingText}>正在为你挑好菜…</Text>
            </View>
          )
        }
      />

      {/* 回到顶部悬浮按钮：右下角，滑过一段才出现 */}
      {showTop && (
        <TouchableOpacity
          style={[styles.scrollTopFab, { bottom: Math.max(insets.bottom, 12) + 64 + 14 }]}
          onPress={handleScrollTop}
          activeOpacity={0.85}
          accessibilityLabel="回到顶部"
        >
          <ArrowUp size={20} color={Palette.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  scrollTopFab: {
    position: 'absolute',
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 50,
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
  brandMascot: {
    width: 48,
    height: 36,
  },
  brandTextWrap: {
    flex: 1,
    gap: 1,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 23,
    fontWeight: '400',
    color: Palette.cocoa[900],
    letterSpacing: 2,
  },
  // 站酷快乐体（与开屏动画一致的品牌展示字体），就绪后启用
  brandTitleFont: {
    fontFamily: 'ZCOOL KuaiLe',
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '600',
    color: Palette.inkLight,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
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
  feedRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  feedEndText: {
    textAlign: 'center',
    fontSize: 12,
    color: Palette.inkMuted,
    paddingVertical: 18,
  },
  feedLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  feedLoadingText: {
    fontSize: 12,
    color: Palette.inkMuted,
  },
});
