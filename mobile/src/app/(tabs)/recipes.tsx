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

const ALL_CATEGORY = '全部';
const LEFT_ITEM_HEIGHT = 46;

// 圆润温润的美食大卡片（告别方正生硬）
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
      {/* 柔润大圆角封面 */}
      <View style={styles.cardImageContainer}>
        <RecipeImage
          coverImage={recipe.coverImage}
          name={recipe.name}
          category={recipe.category}
        />
        {/* 收藏红心 */}
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

        {/* 烹饪时长小胶囊 */}
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
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{recipe.category}</Text>
          </View>
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
          sectionIndex: index,
          data: catRecipes,
        };
      })
      .filter((s) => s.data.length > 0);
  }, [allRecipes, rawCategories]);

  // 左侧导航列表：包含最顶部的【全部】分类，纯单行，无任何数量与图标
  const categoryNavItems = useMemo(() => {
    return [
      { name: ALL_CATEGORY, sectionIndex: -1 },
      ...sections.map((s, idx) => ({
        name: s.title,
        sectionIndex: idx,
      })),
    ];
  }, [sections]);

  // 初始选中索引
  const initialNavIndex = useMemo(() => {
    if (params.category && params.category !== ALL_CATEGORY) {
      const idx = categoryNavItems.findIndex((c) => c.name === params.category);
      return idx >= 0 ? idx : 0;
    }
    return 0; // 默认选中“全部”
  }, [params.category, categoryNavItems]);

  const [activeNavIndex, setActiveNavIndex] = useState<number>(initialNavIndex);
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

  // 点击左侧分类导航（安全滚动，彻底杜绝 scrollToIndex 崩溃报错）
  const handleSelectCategory = (navIndex: number) => {
    if (navIndex === activeNavIndex) return;
    setActiveNavIndex(navIndex);

    isClickingRef.current = true;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      isClickingRef.current = false;
    }, 500);

    // 如果选中的是【全部】，右侧直接滚到最顶部
    if (navIndex === 0) {
      try {
        sectionListRef.current?.scrollToLocation({
          sectionIndex: 0,
          itemIndex: 0,
          animated: true,
          viewOffset: 0,
        });
      } catch (_) {}
    } else {
      const targetSectionIndex = navIndex - 1;
      try {
        sectionListRef.current?.scrollToLocation({
          sectionIndex: targetSectionIndex,
          itemIndex: 0,
          animated: true,
          viewOffset: 0,
        });
      } catch (_) {}
    }

    // 左侧导航滚动
    try {
      leftListRef.current?.scrollToIndex({
        index: navIndex,
        animated: true,
        viewPosition: 0.35,
      });
    } catch (_) {}
  };

  // 右侧滚动时同步左侧高亮
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (isClickingRef.current || viewableItems.length === 0) return;

      const topItem = viewableItems[0];
      if (topItem?.section) {
        const secIndex = (topItem.section as any).sectionIndex;
        if (typeof secIndex === 'number') {
          // 映射到 navIndex: secIndex 0 对应 navIndex 1，若就在顶端对应 0
          const targetNavIndex = secIndex + 1;
          if (targetNavIndex !== activeNavIndex) {
            setActiveNavIndex(targetNavIndex);
            try {
              leftListRef.current?.scrollToIndex({
                index: targetNavIndex,
                animated: true,
                viewPosition: 0.35,
              });
            } catch (_) {}
          }
        }
      }
    },
    [activeNavIndex]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 15,
    waitForInteraction: true,
  }).current;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 1. 顶部搜索框：大圆角胶囊 */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={16} color={Palette.cocoa[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索菜名、食材、菜系..."
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

      {/* 2. 主体区 */}
      {keyword.trim().length > 0 ? (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.searchResultHeader}>匹配的菜谱</Text>
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
          {/* 左侧：含【全部】、单行、圆润药丸的高亮侧边栏 */}
          <View style={styles.leftNavWrapper}>
            <FlatList
              ref={leftListRef}
              data={categoryNavItems}
              keyExtractor={(item) => item.name}
              showsVerticalScrollIndicator={false}
              getItemLayout={(data, index) => ({
                length: LEFT_ITEM_HEIGHT,
                offset: LEFT_ITEM_HEIGHT * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  try {
                    leftListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: false,
                    });
                  } catch (_) {}
                }, 100);
              }}
              contentContainerStyle={styles.leftNavContent}
              renderItem={({ item, index }) => {
                const isActive = activeNavIndex === index;
                return (
                  <TouchableOpacity
                    style={[
                      styles.leftNavPill,
                      isActive && styles.leftNavPillActive,
                    ]}
                    onPress={() => handleSelectCategory(index)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.navLabel,
                        isActive && styles.navLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* 右侧：超圆润大图卡片流 */}
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
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  try {
                    sectionListRef.current?.scrollToLocation({
                      sectionIndex: info.index,
                      itemIndex: 0,
                      animated: false,
                    });
                  } catch (_) {}
                }, 100);
              }}
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderTitle}>{title}</Text>
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
    paddingHorizontal: 14,
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
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ECE4DA',
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
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
  // 左侧导航：柔润圆角，单行无图标无数量
  leftNavWrapper: {
    width: 76,
    backgroundColor: '#F5F0E8',
    borderRightWidth: 1,
    borderRightColor: '#EAE1D5',
  },
  leftNavContent: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 4,
  },
  leftNavPill: {
    height: LEFT_ITEM_HEIGHT,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  leftNavPillActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.apricot[200],
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.cocoa[700],
  },
  navLabelActive: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Palette.apricot[600],
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
    backgroundColor: Palette.oat[50],
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 2,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.cocoa[900],
    letterSpacing: 0.3,
  },
  cardItemWrapper: {
    marginBottom: 12,
  },
  // 极具呼吸感与超多圆角的大图美食卡片
  gourmetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 7,
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  cardImageContainer: {
    width: '100%',
    height: 124,
    borderRadius: 16,
    overflow: 'hidden',
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
  },
  cardTimeBadge: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    gap: 3,
  },
  cardTimeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardBody: {
    paddingTop: 8,
    paddingHorizontal: 6,
    paddingBottom: 4,
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
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
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
  categoryPill: {
    backgroundColor: Palette.apricot[50],
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.apricot[600],
  },
  cardAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
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
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[400],
    marginBottom: 10,
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
