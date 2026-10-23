import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Search, X, Heart, Clock, Plus, UtensilsCrossed } from 'lucide-react-native';
import { useAllRecipes, getCategoriesWithCounts } from '@/lib/recipes';
import { RecipeImage } from '@/components/RecipeImage';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useWeeklyPlanStore } from '@/store/weeklyPlanStore';
import { Recipe, DifficultyLevel } from '@/types';
import { Palette } from '@/constants/theme';

const difficultyLabel: Record<DifficultyLevel, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

// 治愈系右侧宽幅杂志卡片
const GourmetRightCard: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { addToFirstEmptySlot } = useWeeklyPlanStore();
  const favorite = isFavorite(recipe.id);

  const handlePress = () => {
    router.push({
      pathname: '/recipe/[id]',
      params: { id: recipe.id },
    });
  };

  const handleToggleFavorite = (e: any) => {
    e?.stopPropagation?.();
    toggleFavorite(recipe.id);
  };

  const handleAddToPlan = (e: any) => {
    e?.stopPropagation?.();
    const result = addToFirstEmptySlot(recipe.id);
    if (result) {
      Alert.alert('已加入餐盘', `「${recipe.name}」已安排到本周就餐计划！`);
    } else {
      Alert.alert('提示', '本周餐盘已满，可前往周计划调整');
    }
  };

  const ingredientPreview = recipe.ingredients
    .slice(0, 3)
    .map((i) => i.name)
    .join(' · ');

  return (
    <TouchableOpacity
      style={styles.gourmetCard}
      onPress={handlePress}
      activeOpacity={0.88}
    >
      {/* 宽屏圆角封面大图 */}
      <View style={styles.cardImageContainer}>
        <RecipeImage
          coverImage={recipe.coverImage}
          name={recipe.name}
          category={recipe.category}
        />
        {/* 悬浮收藏心标 */}
        <TouchableOpacity
          style={styles.cardHeartBtn}
          onPress={handleToggleFavorite}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Heart
            size={14}
            color={favorite ? Palette.apricot[500] : '#FFFFFF'}
            fill={favorite ? Palette.apricot[500] : 'rgba(0,0,0,0.25)'}
          />
        </TouchableOpacity>

        {/* 左下角小巧烹饪时长胶囊 */}
        <View style={styles.cardTimeBadge}>
          <Clock size={10} color="#FFFFFF" />
          <Text style={styles.cardTimeText}>{recipe.cookTime}分钟</Text>
        </View>
      </View>

      {/* 菜谱信息区 */}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {recipe.name}
          </Text>
          <View style={styles.difficultyPill}>
            <Text style={styles.difficultyText}>
              {difficultyLabel[recipe.difficulty]}
            </Text>
          </View>
        </View>

        {Boolean(ingredientPreview) && (
          <Text style={styles.cardIngredients} numberOfLines={1}>
            配料：{ingredientPreview}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.cardCategoryLabel}>{recipe.category}</Text>
          <TouchableOpacity
            style={styles.cardAddBtn}
            onPress={handleAddToPlan}
            activeOpacity={0.75}
          >
            <Plus size={11} color={Palette.apricot[600]} />
            <Text style={styles.cardAddBtnText}>加餐盘</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function RecipesScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const allRecipes = useAllRecipes();
  const rawCategories = getCategoriesWithCounts(allRecipes);

  // 构建各分类及对应的菜谱
  const sections = useMemo(() => {
    return rawCategories
      .map((cat, index) => {
        const catRecipes = allRecipes.filter((r) => r.category === cat.name);
        return {
          title: cat.name,
          icon: cat.icon,
          count: catRecipes.length,
          sectionIndex: index,
          data: catRecipes,
        };
      })
      .filter((s) => s.data.length > 0);
  }, [allRecipes, rawCategories]);

  // 左侧导航列表
  const categoryNavItems = useMemo(() => {
    return sections.map((s, idx) => ({
      name: s.title,
      icon: s.icon,
      count: s.count,
      sectionIndex: idx,
    }));
  }, [sections]);

  // 初始选中索引
  const initialIndex = useMemo(() => {
    if (params.category) {
      const idx = sections.findIndex((s) => s.title === params.category);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  }, [params.category, sections]);

  const [activeIndex, setActiveIndex] = useState<number>(initialIndex);
  const [keyword, setKeyword] = useState<string>('');

  const leftListRef = useRef<FlatList>(null);
  const sectionListRef = useRef<SectionList<Recipe>>(null);
  const isClickingRef = useRef<boolean>(false);
  const clickTimerRef = useRef<any>(null);

  // 实时搜索过滤
  const searchResults = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return [];
    return allRecipes.filter(
      (r) =>
        r.name.toLowerCase().includes(kw) ||
        r.category.toLowerCase().includes(kw) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(kw))
    );
  }, [allRecipes, keyword]);

  // 点击左侧分类
  const handleSelectCategory = (index: number) => {
    if (index === activeIndex) return;
    setActiveIndex(index);

    isClickingRef.current = true;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      isClickingRef.current = false;
    }, 600);

    // 平滑滚动到右侧对应 Section
    sectionListRef.current?.scrollToLocation({
      sectionIndex: index,
      itemIndex: 0,
      animated: true,
      viewOffset: 0,
    });

    // 保持左侧分类在可视区
    leftListRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.35,
    });
  };

  // 右侧滚动时同步左侧高亮
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (isClickingRef.current || viewableItems.length === 0) return;

      const topItem = viewableItems[0];
      if (topItem?.section) {
        const secIndex = (topItem.section as any).sectionIndex;
        if (typeof secIndex === 'number' && secIndex !== activeIndex) {
          setActiveIndex(secIndex);
          leftListRef.current?.scrollToIndex({
            index: secIndex,
            animated: true,
            viewPosition: 0.35,
          });
        }
      }
    },
    [activeIndex]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 15,
    waitForInteraction: true,
  }).current;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 1. 顶部搜索框：固定吸顶，永不随滚动消失 */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={16} color={Palette.cocoa[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder={`搜索全库 ${allRecipes.length} 道美味灵感...`}
            placeholderTextColor={Palette.cocoa[400]}
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {keyword.length > 0 && (
            <TouchableOpacity
              onPress={() => setKeyword('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={Palette.cocoa[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. 主体：搜索模式 vs 左右双向联动分类浏览 */}
      {keyword.trim().length > 0 ? (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.searchResultHeader}>
            找到 <Text style={styles.bold}>{searchResults.length}</Text> 道匹配菜谱
          </Text>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.searchListContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={{ marginBottom: 12 }}>
                <GourmetRightCard recipe={item} />
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <UtensilsCrossed size={40} color={Palette.cocoa[200]} />
                <Text style={styles.emptyText}>没有搜到与“{keyword}”相关的菜谱</Text>
              </View>
            }
          />
        </View>
      ) : (
        <View style={styles.splitLayout}>
          {/* 左侧：轻奢极简浮岛分类栏 */}
          <View style={styles.leftNavWrapper}>
            <FlatList
              ref={leftListRef}
              data={categoryNavItems}
              keyExtractor={(item) => item.name}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.leftNavContent}
              renderItem={({ item, index }) => {
                const isActive = activeIndex === index;
                return (
                  <TouchableOpacity
                    style={[
                      styles.leftNavCard,
                      isActive && styles.leftNavCardActive,
                    ]}
                    onPress={() => handleSelectCategory(index)}
                    activeOpacity={0.8}
                  >
                    {/* 分类图标微底座 */}
                    <View
                      style={[
                        styles.iconPod,
                        isActive && styles.iconPodActive,
                      ]}
                    >
                      <Text style={styles.navIconText}>{item.icon}</Text>
                    </View>

                    <Text
                      style={[
                        styles.navLabel,
                        isActive && styles.navLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    <Text
                      style={[
                        styles.navCount,
                        isActive && styles.navCountActive,
                      ]}
                    >
                      {item.count}道
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* 右侧：宽屏杂志大图卡片流 */}
          <View style={styles.rightContentWrapper}>
            <SectionList
              ref={sectionListRef}
              sections={sections}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.rightListContent}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              stickySectionHeadersEnabled={true}
              renderSectionHeader={({ section: { title, icon, count } }) => (
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <Text style={styles.sectionHeaderIcon}>{icon}</Text>
                    <Text style={styles.sectionHeaderTitle}>{title}</Text>
                  </View>
                  <Text style={styles.sectionHeaderCount}>共 {count} 道美味</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <View style={styles.cardItemWrapper}>
                  <GourmetRightCard recipe={item} />
                </View>
              )}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.oat[50],
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: Palette.oat[50],
    borderBottomWidth: 1,
    borderBottomColor: '#EFE7DC',
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE4DA',
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    shadowColor: '#2D231E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Palette.cocoa[900],
    paddingVertical: 0,
  },
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  // 左侧导航
  leftNavWrapper: {
    width: 86,
    backgroundColor: '#F7F3EC',
    borderRightWidth: 1,
    borderRightColor: '#ECE3D7',
  },
  leftNavContent: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 6,
  },
  leftNavCard: {
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  leftNavCardActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#2D231E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconPod: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPodActive: {
    backgroundColor: Palette.apricot[100],
  },
  navIconText: {
    fontSize: 15,
  },
  navLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: Palette.cocoa[700],
    letterSpacing: 0.2,
  },
  navLabelActive: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.apricot[600],
  },
  navCount: {
    fontSize: 9.5,
    color: Palette.cocoa[400],
  },
  navCountActive: {
    color: Palette.apricot[500],
    fontWeight: '600',
  },
  // 右侧内容
  rightContentWrapper: {
    flex: 1,
    backgroundColor: Palette.oat[50],
  },
  rightListContent: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.oat[50],
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 2,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderIcon: {
    fontSize: 14,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.cocoa[900],
    letterSpacing: 0.3,
  },
  sectionHeaderCount: {
    fontSize: 10.5,
    color: Palette.cocoa[400],
    fontWeight: '500',
  },
  cardItemWrapper: {
    marginBottom: 12,
  },
  // 宽屏大图杂志卡片
  gourmetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#2D231E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImageContainer: {
    width: '100%',
    height: 118,
    backgroundColor: Palette.oat[100],
    position: 'relative',
  },
  cardHeartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  cardTimeBadge: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  cardTimeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardBody: {
    padding: 10,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.cocoa[900],
    flex: 1,
    marginRight: 8,
  },
  difficultyPill: {
    backgroundColor: Palette.oat[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  cardIngredients: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardCategoryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.apricot[600],
  },
  cardAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Palette.apricot[50],
    borderWidth: 1,
    borderColor: Palette.apricot[200],
    gap: 2,
  },
  cardAddBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.apricot[600],
  },
  // 搜索结果
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  searchResultHeader: {
    fontSize: 11.5,
    color: Palette.cocoa[400],
    marginBottom: 10,
  },
  bold: {
    fontWeight: '700',
    color: Palette.apricot[600],
  },
  searchListContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: Palette.cocoa[400],
  },
});
