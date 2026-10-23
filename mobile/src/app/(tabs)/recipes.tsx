import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Search,
  X,
  Heart,
  ArrowUpDown,
  LayoutGrid,
  Rows3,
  Check,
  Plus,
  Zap,
} from 'lucide-react-native';
import { useAllRecipes, getCategoriesWithCounts } from '@/lib/recipes';
import { RecipeImage } from '@/components/RecipeImage';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useTodayPlateStore } from '@/store/todayPlateStore';
import { useMealPlanSheetStore } from '@/store/mealPlanSheetStore';
import { Recipe, DifficultyLevel } from '@/types';
import { Palette } from '@/constants/theme';

const ALL_CATEGORY = '全部';

type SortMode = 'default' | 'timeAsc' | 'easyFirst';
type CardLayout = 'compact' | 'magazine';

const SORT_LABELS: Record<SortMode, string> = {
  default: '综合',
  timeAsc: '最快',
  easyFirst: '简单优先',
};

// 列表虚拟化数据项联合类型
type FlatListItem =
  | { type: 'header'; category: string; count: number }
  | { type: 'recipe'; recipe: Recipe };

// 难度标签配色转换
function renderDifficultyBadge(difficulty: DifficultyLevel) {
  if (difficulty === 'easy') {
    return (
      <View style={[styles.diffBadge, { backgroundColor: Palette.sageSoft }]}>
        <Text style={[styles.diffBadgeText, { color: Palette.sage }]}>简单</Text>
      </View>
    );
  }
  if (difficulty === 'medium') {
    return (
      <View style={[styles.diffBadge, { backgroundColor: Palette.amberSoft }]}>
        <Text style={[styles.diffBadgeText, { color: Palette.amberWarm }]}>家常</Text>
      </View>
    );
  }
  return (
    <View style={[styles.diffBadge, { backgroundColor: Palette.roseSoft }]}>
      <Text style={[styles.diffBadgeText, { color: Palette.roseWarm }]}>进阶</Text>
    </View>
  );
}

// 模式 A：黄金比例“左图右文”精品横卡（默认推荐）
const CompactHorizontalCard = React.memo<{ recipe: Recipe }>(({ recipe }) => {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { isInPlate, togglePlate, showToast } = useTodayPlateStore();
  const favorite = isFavorite(recipe.id);
  const inPlate = isInPlate(recipe.id);

  const handlePress = () => {
    router.push({
      pathname: '/recipe/[id]',
      params: { id: recipe.id },
    });
  };

  const handleToggleFavorite = (e: any) => {
    e?.stopPropagation?.();
    toggleFavorite(recipe.id);
    showToast(favorite ? '已取消收藏' : `❤️ 已收藏「${recipe.name}」`);
  };

  const handleTogglePlate = (e: any) => {
    e?.stopPropagation?.();
    const added = togglePlate(recipe.id);
    showToast(
      added
        ? `🍽️「${recipe.name}」已飞入底部餐盘`
        : `已从餐盘移出「${recipe.name}」`
    );
  };

  const handleLongPress = () => {
    useMealPlanSheetStore.getState().openSheet(recipe);
  };

  const shortIngs = recipe.ingredients.slice(0, 3).map((i) => i.name);

  return (
    <TouchableOpacity
      style={styles.compactCard}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.88}
    >
      {/* 左侧 94x94 高清圆角实拍图 */}
      <View style={styles.compactImageContainer}>
        <RecipeImage
          coverImage={recipe.coverImage}
          name={recipe.name}
          category={recipe.category}
        />

        {/* 右上角微缩收藏红心 */}
        <TouchableOpacity
          style={styles.floatingHeartBtn}
          onPress={handleToggleFavorite}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Heart
            size={13}
            color={favorite ? Palette.roseWarm : Palette.inkMuted}
            fill={favorite ? Palette.roseWarm : 'transparent'}
          />
        </TouchableOpacity>

        {/* 左下角毛玻璃耗时胶囊 */}
        <View style={styles.glassTimeBadge}>
          <Text style={styles.glassTimeText}>⏱ {recipe.cookTime}分</Text>
        </View>
      </View>

      {/* 右侧紧凑三段式信息区 */}
      <View style={styles.compactInfo}>
        <View>
          {/* 第一行：菜名 + 难度徽章 */}
          <View style={styles.compactTitleRow}>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {recipe.name}
            </Text>
            {renderDifficultyBadge(recipe.difficulty)}
          </View>

          {/* 第二行：食材微胶囊 */}
          <View style={styles.tagsRow}>
            {shortIngs.map((ing, i) => (
              <View key={i} style={styles.ingTag}>
                <Text style={styles.ingTagText} numberOfLines={1}>
                  {ing}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 第三行：分类风味 + 加入餐盘按钮 */}
        <View style={styles.compactFooter}>
          <Text style={styles.compactMeta} numberOfLines={1}>
            <Text style={styles.compactCategory}>#{recipe.category}</Text> · {recipe.cookTime}分钟
          </Text>

          <TouchableOpacity
            style={[styles.plateActionBtn, inPlate && styles.plateActionBtnActive]}
            onPress={handleTogglePlate}
            activeOpacity={0.8}
          >
            {inPlate ? (
              <>
                <Check size={11} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.plateActionBtnTextActive}>已加</Text>
              </>
            ) : (
              <>
                <Plus size={11} color={Palette.primary} strokeWidth={2.5} />
                <Text style={styles.plateActionBtnText}>餐盘</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// 模式 B：杂志感大图海报卡
const MagazineCard = React.memo<{ recipe: Recipe }>(({ recipe }) => {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { isInPlate, togglePlate, showToast } = useTodayPlateStore();
  const favorite = isFavorite(recipe.id);
  const inPlate = isInPlate(recipe.id);

  const handlePress = () => {
    router.push({
      pathname: '/recipe/[id]',
      params: { id: recipe.id },
    });
  };

  const handleToggleFavorite = (e: any) => {
    e?.stopPropagation?.();
    toggleFavorite(recipe.id);
    showToast(favorite ? '已取消收藏' : `❤️ 已收藏「${recipe.name}」`);
  };

  const handleTogglePlate = (e: any) => {
    e?.stopPropagation?.();
    const added = togglePlate(recipe.id);
    showToast(
      added
        ? `🍽️「${recipe.name}」已飞入底部餐盘`
        : `已从餐盘移出「${recipe.name}」`
    );
  };

  return (
    <TouchableOpacity
      style={styles.magazineCard}
      onPress={handlePress}
      activeOpacity={0.88}
    >
      <View style={styles.magazineImageContainer}>
        <RecipeImage
          coverImage={recipe.coverImage}
          name={recipe.name}
          category={recipe.category}
        />

        {/* 顶部收藏 */}
        <TouchableOpacity
          style={styles.floatingHeartBtnLarge}
          onPress={handleToggleFavorite}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Heart
            size={15}
            color={favorite ? Palette.roseWarm : Palette.inkMuted}
            fill={favorite ? Palette.roseWarm : 'transparent'}
          />
        </TouchableOpacity>

        {/* 底部融合菜名与耗时（独立分行，绝不重叠） */}
        <View style={styles.magazineOverlay}>
          <View style={styles.magazineOverlayLeft}>
            <View style={styles.magazineTimeBadge}>
              <Text style={styles.magazineTimeText}>
                ⏱ {recipe.cookTime}分钟 · #{recipe.category}
              </Text>
            </View>
            <Text style={styles.magazineTitle} numberOfLines={1}>
              {recipe.name}
            </Text>
          </View>
          <View style={styles.magazineDiffWrapper}>
            {renderDifficultyBadge(recipe.difficulty)}
          </View>
        </View>
      </View>

      <View style={styles.magazineFooter}>
        <Text style={styles.magazineIngs} numberOfLines={1}>
          配料：{recipe.ingredients.slice(0, 4).map((i) => i.name).join(' · ')}
        </Text>

        <TouchableOpacity
          style={[styles.plateActionBtnLarge, inPlate && styles.plateActionBtnLargeActive]}
          onPress={handleTogglePlate}
          activeOpacity={0.8}
        >
          {inPlate ? (
            <>
              <Check size={12} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.plateActionBtnTextActive}>已加餐盘</Text>
            </>
          ) : (
            <>
              <Plus size={12} color={Palette.primary} strokeWidth={2.5} />
              <Text style={styles.plateActionBtnText}>+ 加餐盘</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

export default function RecipesScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const allRecipes = useAllRecipes();
  const rawCategories = useMemo(() => getCategoriesWithCounts(allRecipes), [allRecipes]);

  // 状态管理
  const [selectedCategory, setSelectedCategory] = useState<string>(
    params.category || ALL_CATEGORY
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyFast, setOnlyFast] = useState<boolean>(false);
  const [onlyFav, setOnlyFav] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [cardLayout, setCardLayout] = useState<CardLayout>('compact');

  const { isFavorite } = useFavoritesStore();
  const { showToast } = useTodayPlateStore();

  const flatListRef = useRef<FlatList<FlatListItem>>(null);
  const leftSidebarRef = useRef<any>(null);

  // 避免点击跳转触发滚动监听互相冲突
  const isClickScrolling = useRef<boolean>(false);
  const clickTimer = useRef<any>(null);
  const activeCatRef = useRef<string>(selectedCategory);

  // 左侧导航列表（包含“全部”与已有菜谱的分类）
  const categoryNavItems = useMemo(() => {
    const list = [ALL_CATEGORY];
    rawCategories.forEach((cat) => {
      if (cat.count > 0 && !list.includes(cat.name)) {
        list.push(cat.name);
      }
    });
    return list;
  }, [rawCategories]);

  // 构建平铺数据（包含分类 Header 与 Recipe Item），用于虚拟化滚动和精准跳转
  const { flatListData, categoryIndexMap, totalCount } = useMemo(() => {
    const isSearching = Boolean(searchQuery.trim());
    const q = searchQuery.trim().toLowerCase();

    const diffMap: Record<DifficultyLevel, number> = {
      easy: 1,
      medium: 2,
      hard: 3,
    };

    // 过滤函数
    const matchFilter = (r: Recipe) => {
      if (onlyFast && r.cookTime > 30) return false;
      if (onlyFav && !isFavorite(r.id)) return false;
      if (isSearching) {
        const matchTitle = r.name.toLowerCase().includes(q);
        const matchCat = r.category.toLowerCase().includes(q);
        const matchIng = r.ingredients.some((i) => i.name.toLowerCase().includes(q));
        if (!matchTitle && !matchCat && !matchIng) return false;
      }
      return true;
    };

    // 排序函数
    const sortFn = (a: Recipe, b: Recipe) => {
      if (sortMode === 'timeAsc') return a.cookTime - b.cookTime;
      if (sortMode === 'easyFirst') return diffMap[a.difficulty] - diffMap[b.difficulty];
      return 0;
    };

    const flatItems: FlatListItem[] = [];
    const indexMap: Record<string, number> = {};
    let total = 0;

    if (isSearching) {
      // 搜索模式：直接展示搜索结果平铺
      const matched = allRecipes.filter(matchFilter);
      if (sortMode !== 'default') matched.sort(sortFn);
      matched.forEach((r) => {
        flatItems.push({ type: 'recipe', recipe: r });
      });
      total = matched.length;
    } else {
      // 浏览模式：按分类依次平铺组装，保留分类 Header
      rawCategories.forEach((cat) => {
        if (cat.count === 0) return;
        let catRecipes = allRecipes.filter((r) => r.category === cat.name && matchFilter(r));
        if (catRecipes.length === 0) return;

        if (sortMode !== 'default') catRecipes.sort(sortFn);

        // 记录该分类组起始在 FlatList 中的 index
        indexMap[cat.name] = flatItems.length;

        // 插入组头
        flatItems.push({
          type: 'header',
          category: cat.name,
          count: catRecipes.length,
        });

        // 插入属于该组的菜谱
        catRecipes.forEach((recipe) => {
          flatItems.push({ type: 'recipe', recipe });
        });

        total += catRecipes.length;
      });
    }

    return {
      flatListData: flatItems,
      categoryIndexMap: indexMap,
      totalCount: total,
    };
  }, [allRecipes, rawCategories, searchQuery, onlyFast, onlyFav, sortMode, isFavorite]);

  // 滚动时动态识别当前视口第一项属于哪个分类（滚动分类跟随功能）
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (isClickScrolling.current) return;
      if (!viewableItems || viewableItems.length === 0) return;

      const firstVisible = viewableItems[0]?.item;
      if (!firstVisible) return;

      const currentCategory =
        firstVisible.type === 'header'
          ? firstVisible.category
          : firstVisible.recipe.category;

      if (currentCategory && currentCategory !== activeCatRef.current) {
        activeCatRef.current = currentCategory;
        setSelectedCategory(currentCategory);
      }
    }
  ).current;

  // 监听回到顶部的滚动距离
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isClickScrolling.current) return;
      const scrollY = e.nativeEvent.contentOffset.y;
      if (scrollY <= 20) {
        if (activeCatRef.current !== ALL_CATEGORY) {
          activeCatRef.current = ALL_CATEGORY;
          setSelectedCategory(ALL_CATEGORY);
        }
      }
    },
    []
  );

  // 当跟随分类改变时，左侧侧边栏自动滑动以保持高亮可见
  useEffect(() => {
    const idx = categoryNavItems.indexOf(selectedCategory);
    if (idx >= 0) {
      leftSidebarRef.current?.scrollTo({
        y: Math.max(0, idx * 44 - 100),
        animated: true,
      });
    }
  }, [selectedCategory, categoryNavItems]);

  // 点击左侧分类：100% 精准跳转定位
  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    activeCatRef.current = catName;

    // 锁定跟随监听 650ms，防止滚动过程中高亮抖动
    isClickScrolling.current = true;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 650);

    if (catName === ALL_CATEGORY) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } else {
      const targetIndex = categoryIndexMap[catName];
      if (typeof targetIndex === 'number') {
        try {
          flatListRef.current?.scrollToIndex({
            index: targetIndex,
            animated: true,
            viewPosition: 0,
          });
        } catch {
          flatListRef.current?.scrollToOffset({
            offset: targetIndex * 92,
            animated: true,
          });
        }
      }
    }
  };

  // 切换排序
  const handleCycleSort = () => {
    const modes: SortMode[] = ['default', 'timeAsc', 'easyFirst'];
    const nextIdx = (modes.indexOf(sortMode) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    setSortMode(nextMode);
    showToast(`排序：${SORT_LABELS[nextMode]}`);
  };

  // 切换卡片视图
  const handleToggleLayout = () => {
    const next = cardLayout === 'compact' ? 'magazine' : 'compact';
    setCardLayout(next);
    showToast(next === 'compact' ? '已切换：精品横卡' : '已切换：杂志大图流');
  };

  // 重置全部筛选
  const handleResetFilters = () => {
    setSelectedCategory(ALL_CATEGORY);
    setSearchQuery('');
    setOnlyFast(false);
    setOnlyFav(false);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 1. 顶部搜索与灵感胶囊区 */}
      <View style={styles.topHeader}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={15} color={Palette.primary} strokeWidth={2.2} />
            <TextInput
              style={styles.searchInput}
              placeholder="搜菜名、冰箱食材（如：排骨、冬瓜、虾）..."
              placeholderTextColor="rgba(133, 124, 116, 0.7)"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
              }}
              returnKeyType="search"
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={15} color={Palette.inkLight} />
              </TouchableOpacity>
            )}
          </View>

          {/* 快捷快手过滤：⚡ 30分内 */}
          <TouchableOpacity
            style={[styles.quickTagBtn, onlyFast && styles.quickTagBtnActive]}
            onPress={() => {
              const next = !onlyFast;
              setOnlyFast(next);
              showToast(next ? '⚡ 已筛选：30分钟内快手菜' : '已显示全部时长');
            }}
            activeOpacity={0.8}
          >
            <Zap
              size={12}
              color={onlyFast ? '#FFFFFF' : Palette.amberWarm}
              fill={onlyFast ? '#FFFFFF' : Palette.amberWarm}
            />
            <Text
              style={[styles.quickTagText, onlyFast && styles.quickTagTextActive]}
            >
              30分内
            </Text>
          </TouchableOpacity>

          {/* 快捷收藏过滤：❤️ */}
          <TouchableOpacity
            style={[styles.quickFavBtn, onlyFav && styles.quickFavBtnActive]}
            onPress={() => {
              const next = !onlyFav;
              setOnlyFav(next);
              showToast(next ? '❤️ 仅显示已收藏菜谱' : '已关闭收藏筛选');
            }}
            activeOpacity={0.8}
          >
            <Heart
              size={14}
              color={onlyFav ? '#FFFFFF' : Palette.roseWarm}
              fill={onlyFav ? '#FFFFFF' : 'transparent'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. 核心中段双栏布局 */}
      <View style={styles.mainLayout}>
        {/* 左侧菜单栏 (单行排布，左侧边框高亮垂直居中) */}
        <View style={styles.leftSidebarContainer}>
          <ScrollView
            ref={leftSidebarRef}
            style={styles.leftSidebar}
            contentContainerStyle={styles.leftSidebarContent}
            showsVerticalScrollIndicator={false}
          >
            {categoryNavItems.map((catName) => {
              const isActive = selectedCategory === catName;
              return (
                <TouchableOpacity
                  key={catName}
                  style={[
                    styles.categoryItem,
                    isActive && styles.categoryItemActive,
                  ]}
                  onPress={() => handleSelectCategory(catName)}
                  activeOpacity={0.8}
                >
                  {/* 选中态左侧焦糖色指示条（在卡片正中间，绝无偏差） */}
                  <View style={styles.indicatorSlot}>
                    {isActive && <View style={styles.activeIndicator} />}
                  </View>

                  {/* 矢量图标 (单行排布) */}
                  <View style={styles.categoryIconWrapper}>
                    <CategoryIcon category={catName} isActive={isActive} size={15} />
                  </View>

                  {/* 分类名称 (严格单行，不换行) */}
                  <Text
                    style={[
                      styles.categoryName,
                      isActive && styles.categoryNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {catName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 右侧主内容托盘 (支持双向联动滚动跟随与虚拟化加载) */}
        <View style={styles.rightSheet}>
          {/* 右侧顶部粘性分类标题与工具 */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleGroup}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {searchQuery
                  ? `搜索结果`
                  : selectedCategory === ALL_CATEGORY
                  ? '全部精选菜谱'
                  : selectedCategory}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{totalCount}道</Text>
              </View>
            </View>

            <View style={styles.sheetTools}>
              {/* 排序切换 */}
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={handleCycleSort}
                activeOpacity={0.75}
              >
                <ArrowUpDown size={11} color={Palette.inkMuted} />
                <Text style={styles.toolBtnText}>{SORT_LABELS[sortMode]}</Text>
              </TouchableOpacity>

              {/* 视图样式切换：横卡 vs 大图卡 */}
              <TouchableOpacity
                style={styles.layoutToggleBtn}
                onPress={handleToggleLayout}
                activeOpacity={0.75}
              >
                {cardLayout === 'compact' ? (
                  <Rows3 size={14} color={Palette.primary} />
                ) : (
                  <LayoutGrid size={14} color={Palette.inkMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* 虚拟化列表 (FlatList 附带滚动跟随功能) */}
          <FlatList
            ref={flatListRef}
            data={flatListData}
            keyExtractor={(item, index) =>
              item.type === 'header'
                ? `header-${item.category}`
                : `recipe-${item.recipe.id}`
            }
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return (
                  <View style={styles.sectionHeaderBar}>
                    <Text style={styles.sectionHeaderTitle}>{item.category}</Text>
                    <View style={styles.sectionCountPill}>
                      <Text style={styles.sectionCountText}>{item.count}道</Text>
                    </View>
                  </View>
                );
              }
              return cardLayout === 'compact' ? (
                <CompactHorizontalCard recipe={item.recipe} />
              ) : (
                <MagazineCard recipe={item.recipe} />
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews={true}
            contentContainerStyle={styles.rightListContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{
              itemVisiblePercentThreshold: 20,
              waitForInteraction: false,
            }}
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
              setTimeout(() => {
                try {
                  flatListRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0,
                  });
                } catch (_) {}
              }, 100);
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🥣</Text>
                <Text style={styles.emptyTitle}>暂无匹配菜谱</Text>
                <Text style={styles.emptySubtitle}>
                  试试清空上方筛选条件或换个搜索词
                </Text>
                <TouchableOpacity
                  style={styles.emptyResetBtn}
                  onPress={handleResetFilters}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyResetBtnText}>查看全部菜谱</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  // 1. 顶部 Header
  topHeader: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: Palette.canvas,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ECE4D8',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: Palette.ink,
    paddingVertical: 0,
  },
  quickTagBtn: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#ECE4D8',
  },
  quickTagBtnActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  quickTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.inkMuted,
  },
  quickTagTextActive: {
    color: '#FFFFFF',
  },
  quickFavBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECE4D8',
  },
  quickFavBtnActive: {
    backgroundColor: Palette.roseWarm,
    borderColor: Palette.roseWarm,
  },

  // 2. 核心中段双栏布局
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  leftSidebarContainer: {
    width: 90,
    backgroundColor: Palette.canvas,
  },
  leftSidebar: {
    flex: 1,
  },
  leftSidebarContent: {
    paddingLeft: 6,
    paddingRight: 6,
    paddingBottom: 130, // 避免被底部双胶囊遮挡
    gap: 4,
  },

  // 单行类别卡片：图标 + 文字水平一行排布
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingRight: 6,
    borderRadius: 13,
    overflow: 'hidden',
    gap: 4,
  },
  categoryItemActive: {
    backgroundColor: '#FFFFFF',
  },
  indicatorSlot: {
    width: 5,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  activeIndicator: {
    width: 3.5,
    height: 18,
    backgroundColor: Palette.primary,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  categoryIconWrapper: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.inkMuted,
    flex: 1,
  },
  categoryNameActive: {
    color: Palette.primary,
    fontWeight: '800',
  },

  // 右侧托盘 Sheet
  rightSheet: {
    flex: 1,
    backgroundColor: Palette.sheet,
    borderTopLeftRadius: 28,
    overflow: 'hidden',
  },
  sheetHeader: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.sheet,
  },
  sheetTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sheetTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Palette.ink,
  },
  countBadge: {
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Palette.primary,
  },
  sheetTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Palette.tagWarm,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  toolBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Palette.inkMuted,
  },
  layoutToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Palette.tagWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 虚拟化列表样式
  rightListContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 130, // 确保滚动到最后一条时完全不被底部双胶囊遮挡
  },

  // 分类分组标题条
  sectionHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 2,
  },
  sectionHeaderTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Palette.ink,
    letterSpacing: 0.2,
  },
  sectionCountPill: {
    backgroundColor: Palette.tagWarm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectionCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.inkMuted,
  },

  // 模式 A：精品横卡
  compactCard: {
    backgroundColor: Palette.cardBg,
    borderRadius: 20,
    padding: 9,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#EFE7DD',
  },
  compactImageContainer: {
    width: 94,
    height: 94,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: Palette.tagWarm,
    position: 'relative',
  },
  floatingHeartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassTimeBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(34, 30, 28, 0.72)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  glassTimeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  compactInfo: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  compactTitle: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '800',
    color: Palette.ink,
  },
  diffBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  diffBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 5,
  },
  ingTag: {
    backgroundColor: Palette.tagWarm,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ingTagText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: Palette.inkMuted,
  },
  compactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  compactMeta: {
    fontSize: 10,
    color: Palette.inkLight,
    flex: 1,
  },
  compactCategory: {
    color: Palette.primary,
    fontWeight: '700',
  },
  plateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 3,
  },
  plateActionBtnActive: {
    backgroundColor: Palette.primary,
  },
  plateActionBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Palette.primary,
  },
  plateActionBtnTextActive: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 模式 B：杂志大图卡
  magazineCard: {
    backgroundColor: Palette.cardBg,
    borderRadius: 22,
    padding: 8,
    borderWidth: 1,
    borderColor: '#EFE7DD',
    gap: 8,
  },
  magazineImageContainer: {
    height: 148,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Palette.tagWarm,
    position: 'relative',
  },
  floatingHeartBtnLarge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  magazineOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(26, 21, 18, 0.65)',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  magazineOverlayLeft: {
    flex: 1,
    gap: 4,
  },
  magazineTimeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  magazineTimeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  magazineTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  magazineDiffWrapper: {
    paddingBottom: 1,
  },
  magazineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  magazineIngs: {
    fontSize: 11,
    color: Palette.inkMuted,
    flex: 1,
  },
  plateActionBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 3,
  },
  plateActionBtnLargeActive: {
    backgroundColor: Palette.primary,
  },

  // 空状态
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyEmoji: {
    fontSize: 42,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.ink,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11,
    color: Palette.inkMuted,
    marginBottom: 14,
    textAlign: 'center',
  },
  emptyResetBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  emptyResetBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
