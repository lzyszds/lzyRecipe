import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Search, X, UtensilsCrossed, ChefHat } from 'lucide-react-native';
import { useAllRecipes, getCategoriesWithCounts } from '@/lib/recipes';
import { RecipeCard } from '@/components/RecipeCard';
import { Recipe } from '@/types';
import { Palette } from '@/constants/theme';

export default function RecipesScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const allRecipes = useAllRecipes();
  const rawCategories = getCategoriesWithCounts(allRecipes);

  // 过滤出有菜谱的有效分类，构建 sections
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

  // 左侧分类列表
  const categoryNavItems = useMemo(() => {
    return sections.map((s, idx) => ({
      name: s.title,
      icon: s.icon,
      count: s.count,
      sectionIndex: idx,
    }));
  }, [sections]);

  // 初始选中分类
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

  // 点击左侧分类导航
  const handleSelectCategory = (index: number) => {
    if (index === activeIndex) return;
    setActiveIndex(index);

    // 锁定滚动监听，防止 scrollToLocation 触发时高亮抖动
    isClickingRef.current = true;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      isClickingRef.current = false;
    }, 600);

    // 平滑滚动到右侧对应的 Section
    sectionListRef.current?.scrollToLocation({
      sectionIndex: index,
      itemIndex: 0,
      animated: true,
      viewOffset: 0,
    });

    // 左侧也保持可见
    leftListRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.35,
    });
  };

  // 右侧滚动时，监听视口最上方的分类
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (isClickingRef.current || viewableItems.length === 0) return;

      // 找到可见项中属于哪个 section
      const topItem = viewableItems[0];
      if (topItem?.section) {
        const secIndex = (topItem.section as any).sectionIndex;
        if (typeof secIndex === 'number' && secIndex !== activeIndex) {
          setActiveIndex(secIndex);
          // 自动让左侧导航跟着滚动到当前项
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
    itemVisiblePercentThreshold: 20,
    waitForInteraction: true,
  }).current;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 1. 顶部搜索框：固定吸顶，永不随滚动消失 */}
      <View style={styles.fixedSearchBarContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color={Palette.cocoa[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索全库菜谱、食材、菜系..."
            placeholderTextColor={Palette.cocoa[400]}
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => setKeyword('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={Palette.cocoa[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. 主体区：搜索模式 or 左侧分类+右侧列表联动 */}
      {keyword.trim().length > 0 ? (
        // 搜索模式
        <View style={styles.searchResultsContainer}>
          <Text style={styles.searchResultHeader}>
            找到 <Text style={styles.bold}>{searchResults.length}</Text> 道符合的菜谱
          </Text>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.searchListContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <RecipeCard recipe={item} compact />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <UtensilsCrossed size={40} color={Palette.cocoa[200]} />
                <Text style={styles.emptyText}>未找到与“{keyword}”相关的菜谱</Text>
              </View>
            }
          />
        </View>
      ) : (
        // 左侧分类 + 右侧联动浏览模式
        <View style={styles.splitLayout}>
          {/* 左侧垂直分类栏 */}
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
                    style={[styles.leftNavItem, isActive && styles.leftNavItemActive]}
                    onPress={() => handleSelectCategory(index)}
                    activeOpacity={0.8}
                  >
                    {isActive && <View style={styles.activeIndicator} />}
                    <Text style={styles.leftNavIcon}>{item.icon}</Text>
                    <Text
                      style={[styles.leftNavLabel, isActive && styles.leftNavLabelActive]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.leftNavCount, isActive && styles.leftNavCountActive]}
                    >
                      {item.count}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* 右侧按分类分组滚动列表 */}
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
                  <Text style={styles.sectionHeaderIcon}>{icon}</Text>
                  <Text style={styles.sectionHeaderTitle}>{title}</Text>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{count} 道</Text>
                  </View>
                </View>
              )}
              renderItem={({ item }) => (
                <View style={styles.recipeCardWrapper}>
                  <RecipeCard recipe={item} compact />
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
  fixedSearchBarContainer: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: Palette.oat[50],
    borderBottomWidth: 1,
    borderBottomColor: '#EFE9E0',
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.oat[200],
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    shadowColor: Palette.cocoa[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
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
  leftNavWrapper: {
    width: 82,
    backgroundColor: '#F7F3ED',
    borderRightWidth: 1,
    borderRightColor: '#ECE5DB',
  },
  leftNavContent: {
    paddingVertical: 4,
  },
  leftNavItem: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 3,
  },
  leftNavItemActive: {
    backgroundColor: '#FFFFFF',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3.5,
    backgroundColor: Palette.apricot[500],
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  leftNavIcon: {
    fontSize: 16,
  },
  leftNavLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Palette.cocoa[700],
    textAlign: 'center',
  },
  leftNavLabelActive: {
    fontWeight: '800',
    color: Palette.apricot[600],
  },
  leftNavCount: {
    fontSize: 9.5,
    color: Palette.cocoa[400],
  },
  leftNavCountActive: {
    color: Palette.apricot[500],
    fontWeight: '600',
  },
  rightContentWrapper: {
    flex: 1,
    backgroundColor: Palette.oat[50],
  },
  rightListContent: {
    paddingHorizontal: 10,
    paddingBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.oat[50],
    paddingVertical: 8,
    paddingHorizontal: 2,
    gap: 6,
  },
  sectionHeaderIcon: {
    fontSize: 14,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  sectionBadge: {
    backgroundColor: Palette.oat[100],
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    marginLeft: 2,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.cocoa[400],
  },
  recipeCardWrapper: {
    marginBottom: 8,
  },
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  searchResultHeader: {
    fontSize: 11,
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
