import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Search, X, UtensilsCrossed } from 'lucide-react-native';
import { useAllRecipes, getCategoriesWithCounts } from '@/lib/recipes';
import { RecipeCard } from '@/components/RecipeCard';
import { Recipe } from '@/types';
import { Palette } from '@/constants/theme';

const ALL = '全部';

export default function RecipesScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const allRecipes = useAllRecipes();
  const categories = getCategoriesWithCounts(allRecipes);

  const [activeCategory, setActiveCategory] = useState<string>(
    params.category || ALL
  );
  const [keyword, setKeyword] = useState<string>('');

  const categoryList = useMemo(() => {
    return [{ id: 'all', name: ALL, count: allRecipes.length, icon: '🍽️' }, ...categories];
  }, [allRecipes, categories]);

  const filteredRecipes = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return allRecipes.filter((r) => {
      const matchCategory = activeCategory === ALL || r.category === activeCategory;
      if (!matchCategory) return false;
      if (!kw) return true;
      return (
        r.name.toLowerCase().includes(kw) ||
        r.category.toLowerCase().includes(kw) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(kw))
      );
    });
  }, [allRecipes, activeCategory, keyword]);

  const renderHeader = () => (
    <View style={styles.headerArea}>
      {/* 搜索栏 */}
      <View style={styles.searchBox}>
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
          <TouchableOpacity onPress={() => setKeyword('')}>
            <X size={15} color={Palette.cocoa[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* 分类药丸横滑 */}
      <FlatList
        data={categoryList}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.categoryScroll}
        renderItem={({ item }) => {
          const isActive = activeCategory === item.name;
          return (
            <TouchableOpacity
              style={[styles.categoryPill, isActive && styles.categoryPillActive]}
              onPress={() => setActiveCategory(item.name)}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryPillIcon}>{item.icon}</Text>
              <Text
                style={[
                  styles.categoryPillText,
                  isActive && styles.categoryPillTextActive,
                ]}
              >
                {item.name}
              </Text>
              <Text
                style={[
                  styles.categoryPillCount,
                  isActive && styles.categoryPillCountActive,
                ]}
              >
                {item.count}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* 结果计数提示 */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          共找到 <Text style={styles.countBold}>{filteredRecipes.length}</Text> 道菜谱
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <RecipeCard recipe={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <UtensilsCrossed size={36} color={Palette.cocoa[200]} />
            <Text style={styles.emptyText}>没有找到相关菜谱</Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setKeyword('');
                setActiveCategory(ALL);
              }}
            >
              <Text style={styles.resetBtnText}>重置筛选</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.oat[50],
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerArea: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.oat[200],
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Palette.cocoa[900],
    paddingVertical: 0,
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.oat[200],
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
  },
  categoryPillActive: {
    backgroundColor: Palette.apricot[500],
    borderColor: Palette.apricot[500],
  },
  categoryPillIcon: {
    fontSize: 12,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  categoryPillCount: {
    fontSize: 10,
    color: Palette.cocoa[400],
  },
  categoryPillCountActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  countRow: {
    marginTop: 10,
    marginBottom: 4,
  },
  countText: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  countBold: {
    fontWeight: '700',
    color: Palette.apricot[600],
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  gridItem: {
    width: '48%',
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: Palette.cocoa[400],
  },
  resetBtn: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Palette.apricot[100],
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.apricot[600],
  },
});
