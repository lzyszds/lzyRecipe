import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { X, Search, Check, Heart, Zap, Sparkles, Plus } from 'lucide-react-native';
import { useBentoStore, MealType } from '@/store/bentoStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useAllRecipes } from '@/lib/recipes';
import { RecipeImage } from './RecipeImage';
import { toast } from '@/store/feedbackStore';
import { Palette } from '@/constants/theme';
import { getWeekdayName, formatMonthDay } from '@/lib/bentoDate';
import type { Recipe } from '@/types';

interface RecipePoolSheetProps {
  visible: boolean;
  targetDate: string | null;
  targetMeal: MealType | null;
  onClose: () => void;
}

type TabKey = 'pool' | 'fav' | 'fast' | 'all';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

export const RecipePoolSheet: React.FC<RecipePoolSheetProps> = ({
  visible,
  targetDate,
  targetMeal,
  onClose,
}) => {
  const allRecipes = useAllRecipes();
  const { recipePool, addDishesToMeal, applyLunchBentoToWorkdays } = useBentoStore();
  const { favorites } = useFavoritesStore();

  const [activeTab, setActiveTab] = useState<TabKey>('pool');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 重置状态
  React.useEffect(() => {
    if (visible) {
      setSelectedIds(new Set());
      setSearchQuery('');
      // 如果候选池有菜，默认切到候选池，否则默认切到全部或快手
      setActiveTab(recipePool.length > 0 ? 'pool' : 'all');
    }
  }, [visible, recipePool.length]);

  const poolRecipes = useMemo(
    () => allRecipes.filter((r) => recipePool.includes(r.id)),
    [allRecipes, recipePool]
  );

  const favRecipes = useMemo(
    () => allRecipes.filter((r) => favorites.includes(r.id)),
    [allRecipes, favorites]
  );

  const fastRecipes = useMemo(
    () => allRecipes.filter((r) => r.cookTime <= 20),
    [allRecipes]
  );

  const displayedRecipes = useMemo(() => {
    let list: Recipe[] = [];
    if (activeTab === 'pool') list = poolRecipes;
    else if (activeTab === 'fav') list = favRecipes;
    else if (activeTab === 'fast') list = fastRecipes;
    else list = allRecipes;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [activeTab, poolRecipes, favRecipes, fastRecipes, allRecipes, searchQuery]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirmAdd = () => {
    if (!targetDate || !targetMeal || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    addDishesToMeal(targetDate, targetMeal, ids);
    const mealLabel = MEAL_LABELS[targetMeal];
    const dateLabel = `${formatMonthDay(targetDate)} ${getWeekdayName(targetDate)}`;
    toast({
      type: 'success',
      message: `已将 ${ids.length} 道菜放入【${dateLabel} ${mealLabel}】便当`,
    });
    onClose();
  };

  const handleApplyWorkdayLunch = (recipeId: string) => {
    if (!targetDate) return;
    // targetDate 所在周的周一
    applyLunchBentoToWorkdays(targetDate, recipeId);
    toast({
      type: 'success',
      message: '🍱 已将该菜品排入本周一至周五的全部午餐！',
    });
    onClose();
  };

  if (!visible || !targetDate || !targetMeal) return null;

  const targetLabel = `${formatMonthDay(targetDate)} ${getWeekdayName(targetDate)} · ${
    MEAL_LABELS[targetMeal]
  }`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar style="light" animated />
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            {/* 顶栏 */}
            <View style={styles.header}>
              <View>
                <Text style={styles.sheetTitle}>放入便当格</Text>
                <Text style={styles.sheetSubtitle}>目标餐位：{targetLabel}</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={Palette.cocoa[700]} />
              </TouchableOpacity>
            </View>

            {/* 快捷标签栏 */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'pool' && styles.tabItemActive]}
                onPress={() => setActiveTab('pool')}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    activeTab === 'pool' && styles.tabItemTextActive,
                  ]}
                >
                  想吃候选池 ({poolRecipes.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'fav' && styles.tabItemActive]}
                onPress={() => setActiveTab('fav')}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    activeTab === 'fav' && styles.tabItemTextActive,
                  ]}
                >
                  我的收藏 ({favRecipes.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'fast' && styles.tabItemActive]}
                onPress={() => setActiveTab('fast')}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    activeTab === 'fast' && styles.tabItemTextActive,
                  ]}
                >
                  ⚡ 快手菜 (≤20分)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
                onPress={() => setActiveTab('all')}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    activeTab === 'all' && styles.tabItemTextActive,
                  ]}
                >
                  全部菜谱
                </Text>
              </TouchableOpacity>
            </View>

            {/* 搜索框 */}
            <View style={styles.searchBarWrapper}>
              <View style={styles.searchBar}>
                <Search size={14} color={Palette.cocoa[400]} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="搜索想吃的菜名、食材..."
                  placeholderTextColor={Palette.cocoa[400]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {Boolean(searchQuery) && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={14} color={Palette.cocoa[400]} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 菜谱列表（多选） */}
            <FlatList
              data={displayedRecipes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.dishRow, isSelected && styles.dishRowSelected]}
                    onPress={() => toggleSelect(item.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dishThumb}>
                      <RecipeImage
                        coverImage={item.coverImage}
                        name={item.name}
                        category={item.category}
                      />
                    </View>

                    <View style={styles.dishInfo}>
                      <Text style={styles.dishName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.dishMeta}>
                        {item.category} · ⏱ {item.cookTime}分钟
                      </Text>
                    </View>

                    {/* 午餐带饭快捷入口 */}
                    {targetMeal === 'lunch' && (
                      <TouchableOpacity
                        style={styles.workdayBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleApplyWorkdayLunch(item.id);
                        }}
                      >
                        <Text style={styles.workdayBtnText}>一键周一至五带饭</Text>
                      </TouchableOpacity>
                    )}

                    <View
                      style={[
                        styles.checkCircle,
                        isSelected && styles.checkCircleSelected,
                      ]}
                    >
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>没有找到相关菜品</Text>
                  {activeTab === 'pool' && (
                    <Text style={styles.emptyHint}>
                      去菜谱库点「放进想吃池」，随时收纳想吃的灵感！
                    </Text>
                  )}
                </View>
              }
            />

            {/* 底部确认栏 */}
            <View style={styles.footer}>
              <Text style={styles.footerSelectedText}>
                已选 <Text style={styles.highlightNum}>{selectedIds.size}</Text> 道菜
              </Text>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  selectedIds.size === 0 && styles.confirmBtnDisabled,
                ]}
                onPress={handleConfirmAdd}
                disabled={selectedIds.size === 0}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmBtnText}>放入便当格</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '84%',
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  sheetSubtitle: {
    fontSize: 12,
    color: Palette.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.oat[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
  },
  tabItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Palette.oat[100],
  },
  tabItemActive: {
    backgroundColor: 'rgba(217, 107, 56, 0.12)',
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  tabItemTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    backgroundColor: Palette.oat[50],
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Palette.cocoa[900],
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.oat[100],
    gap: 12,
  },
  dishRowSelected: {
    borderColor: Palette.primary,
    backgroundColor: 'rgba(217, 107, 56, 0.04)',
  },
  dishThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Palette.oat[100],
  },
  dishInfo: {
    flex: 1,
  },
  dishName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  dishMeta: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 3,
  },
  workdayBtn: {
    backgroundColor: 'rgba(217, 107, 56, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  workdayBtnText: {
    fontSize: 10,
    color: Palette.primary,
    fontWeight: '700',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Palette.cocoa[400],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleSelected: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  emptyHint: {
    fontSize: 12,
    color: Palette.cocoa[400],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.dockBorder,
    backgroundColor: '#FFFFFF',
  },
  footerSelectedText: {
    fontSize: 13,
    color: Palette.cocoa[700],
  },
  highlightNum: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.primary,
  },
  confirmBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
