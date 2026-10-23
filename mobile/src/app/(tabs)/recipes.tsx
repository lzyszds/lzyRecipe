import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  Search,
  X,
  LayoutGrid,
  ChevronDown,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react-native';
import { useAllRecipes, getCategoriesWithCounts } from '@/lib/recipes';
import { RecipeCard } from '@/components/RecipeCard';
import { Palette } from '@/constants/theme';

const ALL = '全部';

export default function RecipesScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const allRecipes = useAllRecipes();
  const rawCategories = getCategoriesWithCounts(allRecipes);

  const [activeCategory, setActiveCategory] = useState<string>(
    params.category || ALL
  );
  const [keyword, setKeyword] = useState<string>('');
  const [matrixOpen, setMatrixOpen] = useState<boolean>(false);

  const horizontalNavRef = useRef<FlatList>(null);

  // 分类列表包含全部
  const categories = useMemo(() => {
    return [
      { id: 'all', name: ALL, icon: '🍽️', count: allRecipes.length },
      ...rawCategories,
    ];
  }, [allRecipes, rawCategories]);

  // 过滤后的菜谱列表
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

  // 选择分类
  const selectCategory = (name: string, index?: number) => {
    setActiveCategory(name);
    setMatrixOpen(false);

    // 将横滑胶囊居中滚动到该位置
    const targetIndex =
      index !== undefined ? index : categories.findIndex((c) => c.name === name);
    if (targetIndex >= 0) {
      horizontalNavRef.current?.scrollToIndex({
        index: targetIndex,
        animated: true,
        viewPosition: 0.3,
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 1. 顶层吸顶控制区：搜索框 + 灵动分类条 + 全景矩阵展开按钮 */}
      <View style={styles.stickyHeader}>
        {/* 搜索框 */}
        <View style={styles.searchBar}>
          <Search size={15} color={Palette.cocoa[400]} />
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
            <TouchableOpacity onPress={() => setKeyword('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} color={Palette.cocoa[400]} />
            </TouchableOpacity>
          )}
        </View>

        {/* 分类胶囊横滑栏 + 右侧矩阵面板抽屉按钮 */}
        <View style={styles.categoryNavRow}>
          <FlatList
            ref={horizontalNavRef}
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.categoryScrollContent}
            renderItem={({ item, index }) => {
              const isActive = activeCategory === item.name;
              return (
                <TouchableOpacity
                  style={[
                    styles.categoryPill,
                    isActive && styles.categoryPillActive,
                  ]}
                  onPress={() => selectCategory(item.name, index)}
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

          {/* 右侧展开全景面板按钮 */}
          <TouchableOpacity
            style={styles.matrixTriggerBtn}
            onPress={() => setMatrixOpen(true)}
            activeOpacity={0.75}
          >
            <LayoutGrid size={15} color={Palette.cocoa[700]} />
            <ChevronDown size={11} color={Palette.cocoa[400]} style={{ marginTop: 1 }} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. 双列高清大图瀑布流列表 */}
      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeaderSummary}>
            <Text style={styles.summaryText}>
              {activeCategory === ALL ? '全部精选美食' : `${activeCategory}合集`}
              <Text style={styles.summaryBold}> · {filteredRecipes.length} 道</Text>
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <RecipeCard recipe={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <UtensilsCrossed size={42} color={Palette.cocoa[200]} />
            <Text style={styles.emptyTitle}>暂无相关美味</Text>
            <Text style={styles.emptySubtitle}>尝试搜索其他食材，或切换到“全部”分类查看</Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setKeyword('');
                selectCategory(ALL, 0);
              }}
            >
              <Text style={styles.resetBtnText}>重置筛选条件</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* 3. 全景分类矩阵弹窗面板 (一目了然看全所有菜系) */}
      <Modal
        visible={matrixOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMatrixOpen(false)}
      >
        <Pressable
          style={styles.matrixOverlay}
          onPress={() => setMatrixOpen(false)}
        >
          <Pressable style={styles.matrixCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.matrixHeader}>
              <View style={styles.matrixTitleRow}>
                <Sparkles size={16} color={Palette.apricot[500]} />
                <Text style={styles.matrixTitle}>全部分类导航</Text>
                <Text style={styles.matrixSubtitle}>（共 {categories.length} 个分类）</Text>
              </View>
              <TouchableOpacity
                onPress={() => setMatrixOpen(false)}
                style={styles.matrixCloseBtn}
              >
                <X size={18} color={Palette.cocoa[400]} />
              </TouchableOpacity>
            </View>

            <View style={styles.matrixGrid}>
              {categories.map((cat, idx) => {
                const isSelected = activeCategory === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.matrixItem,
                      isSelected && styles.matrixItemActive,
                    ]}
                    onPress={() => selectCategory(cat.name, idx)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.matrixItemIcon}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.matrixItemText,
                        isSelected && styles.matrixItemTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                    <View
                      style={[
                        styles.matrixItemBadge,
                        isSelected && styles.matrixItemBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.matrixItemBadgeText,
                          isSelected && styles.matrixItemBadgeTextActive,
                        ]}
                      >
                        {cat.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.oat[50],
  },
  stickyHeader: {
    backgroundColor: Palette.oat[50],
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE7DE',
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE4DA',
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    shadowColor: '#2D231E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Palette.cocoa[900],
    paddingVertical: 0,
  },
  categoryNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingLeft: 14,
  },
  categoryScrollContent: {
    gap: 8,
    paddingRight: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECE4DA',
    paddingHorizontal: 11,
    paddingVertical: 6,
    gap: 5,
  },
  categoryPillActive: {
    backgroundColor: Palette.apricot[500],
    borderColor: Palette.apricot[500],
    shadowColor: Palette.apricot[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
    color: 'rgba(255, 255, 255, 0.88)',
  },
  matrixTriggerBtn: {
    width: 44,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#EBE3D7',
    paddingRight: 6,
    paddingLeft: 4,
    flexDirection: 'row',
    gap: 2,
  },
  listContainer: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 28,
  },
  listHeaderSummary: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Palette.cocoa[400],
  },
  summaryBold: {
    color: Palette.apricot[600],
    fontWeight: '700',
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
    paddingVertical: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.cocoa[900],
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Palette.cocoa[400],
    textAlign: 'center',
  },
  resetBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Palette.apricot[100],
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.apricot[600],
  },
  matrixOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 24, 20, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  matrixCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  matrixHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2ECE5',
    marginBottom: 14,
  },
  matrixTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matrixTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  matrixSubtitle: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  matrixCloseBtn: {
    padding: 4,
  },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  matrixItem: {
    width: '31%',
    backgroundColor: Palette.oat[50],
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECE4DA',
    gap: 4,
  },
  matrixItemActive: {
    backgroundColor: Palette.apricot[50],
    borderColor: Palette.apricot[400],
  },
  matrixItemIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  matrixItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  matrixItemTextActive: {
    color: Palette.apricot[600],
  },
  matrixItemBadge: {
    backgroundColor: Palette.oat[100],
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  matrixItemBadgeActive: {
    backgroundColor: Palette.apricot[100],
  },
  matrixItemBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: Palette.cocoa[400],
  },
  matrixItemBadgeTextActive: {
    color: Palette.apricot[600],
  },
});
