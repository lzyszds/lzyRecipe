import React, { useState, useMemo, useRef } from 'react';
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

// 圆润温润的美食大卡片（彻底移除阴影，饱满大圆角）
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

  // 构建各分类及对应的菜谱（仅保留有菜谱的分类）
  const sections = useMemo(() => {
    return rawCategories
      .map((cat) => {
        const catRecipes = allRecipes.filter((r) => r.category === cat.name);
        return {
          title: cat.name,
          data: catRecipes,
        };
      })
      .filter((s) => s.data.length > 0);
  }, [allRecipes, rawCategories]);

  // 左侧导航列表：第一项是【全部】，其余为各分类名称（无任何数字和图标）
  const categoryNavItems = useMemo(() => {
    return [ALL_CATEGORY, ...sections.map((s) => s.title)];
  }, [sections]);

  // 初始选中项
  const initialNavIndex = useMemo(() => {
    if (params.category && params.category !== ALL_CATEGORY) {
      const idx = categoryNavItems.findIndex((c) => c === params.category);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  }, [params.category, categoryNavItems]);

  const [activeNavIndex, setActiveNavIndex] = useState<number>(initialNavIndex);
  const [keyword, setKeyword] = useState<string>('');

  const leftListRef = useRef<FlatList>(null);
  const rightScrollRef = useRef<any>(null);

  // 记录每个分类模块在右侧 ScrollView 中的绝对 Y 坐标
  const sectionPositions = useRef<number[]>([]);
  const isClickScrolling = useRef<boolean>(false);
  const clickTimer = useRef<any>(null);

  // 搜索结果
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

  // 测量每个分类的 Y 坐标
  const handleSectionLayout = (index: number, y: number) => {
    sectionPositions.current[index] = y;
  };

  // 点击左侧分类导航：百分之百精准平滑滚动跳转
  const handleSelectCategory = (navIndex: number) => {
    if (navIndex === activeNavIndex) return;
    setActiveNavIndex(navIndex);

    // 锁定滚动监听，防止用户点击滚动时产生抖动
    isClickScrolling.current = true;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 650);

    if (navIndex === 0) {
      // 点击【全部】：滚到最顶部
      rightScrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      const targetIndex = navIndex - 1;
      const targetY = sectionPositions.current[targetIndex] ?? 0;
      rightScrollRef.current?.scrollTo({ y: Math.max(0, targetY - 4), animated: true });
    }

    // 确保左侧当前项在可视区内
    try {
      leftListRef.current?.scrollToIndex({
        index: navIndex,
        animated: true,
        viewPosition: 0.35,
      });
    } catch (_) {}
  };

  // 监听右侧滚动：全行程精准匹配高亮，彻底杜绝“海鲜之后不跟随高亮”的 bug
  const handleRightScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isClickScrolling.current) return;

    const scrollY = event.nativeEvent.contentOffset.y;

    // 距离顶部很近时，高亮【全部】
    if (scrollY < 30) {
      if (activeNavIndex !== 0) {
        setActiveNavIndex(0);
        try {
          leftListRef.current?.scrollToIndex({ index: 0, animated: true, viewPosition: 0.35 });
        } catch (_) {}
      }
      return;
    }

    // 从后往前查找当前滚动位于哪个分类
    const positions = sectionPositions.current;
    let foundIndex = 0;
    for (let i = positions.length - 1; i >= 0; i--) {
      if (typeof positions[i] === 'number' && scrollY >= positions[i] - 30) {
        foundIndex = i + 1; // 对应 navIndex
        break;
      }
    }

    if (foundIndex !== activeNavIndex) {
      setActiveNavIndex(foundIndex);
      try {
        leftListRef.current?.scrollToIndex({
          index: foundIndex,
          animated: true,
          viewPosition: 0.35,
        });
      } catch (_) {}
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 1. 顶部搜索框：大圆角胶囊吸顶 */}
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
        // 搜索匹配结果
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
        // 左右联动分类浏览
        <View style={styles.splitLayout}>
          {/* 左侧：包含【全部】、单行、无图标、无数量、圆润胶囊侧边栏 */}
          <View style={styles.leftNavWrapper}>
            <FlatList
              ref={leftListRef}
              data={categoryNavItems}
              keyExtractor={(item) => item}
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
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* 右侧：精确坐标定位与平滑滚动卡片流 */}
          <ScrollView
            ref={rightScrollRef}
            style={styles.rightContentWrapper}
            contentContainerStyle={styles.rightListContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleRightScroll}
            scrollEventThrottle={16}
          >
            {sections.map((section, sIndex) => (
              <View
                key={section.title}
                style={styles.sectionBlock}
                onLayout={(e) =>
                  handleSectionLayout(sIndex, e.nativeEvent.layout.y)
                }
              >
                {/* 分类标题：纯文字，无任何数字 */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderTitle}>{section.title}</Text>
                </View>

                {/* 分类下的菜谱卡片 */}
                {section.data.map((recipe) => (
                  <View key={recipe.id} style={styles.cardItemWrapper}>
                    <GourmetRightCard recipe={recipe} />
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
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
  // 左侧导航：柔润圆角，单行纯文字，无图标，无数字
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
    paddingBottom: 40,
  },
  sectionBlock: {
    marginBottom: 8,
  },
  sectionHeader: {
    paddingTop: 12,
    paddingBottom: 8,
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
  // 超圆润无阴影大图卡片
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
