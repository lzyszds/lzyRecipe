import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { X, Trash2, Check, Share2, CalendarPlus, Utensils } from 'lucide-react-native';
import { useTodayPlateStore } from '@/store/todayPlateStore';
import { useWeeklyPlanStore } from '@/store/weeklyPlanStore';
import { useAllRecipes } from '@/lib/recipes';
import { RecipeImage } from './RecipeImage';
import { Palette } from '@/constants/theme';

export const TodayPlateModal: React.FC = () => {
  const {
    isModalOpen,
    closeModal,
    plateRecipeIds,
    removeFromPlate,
    clearPlate,
    checkedIngredients,
    toggleIngredientCheck,
    showToast,
  } = useTodayPlateStore();

  const allRecipes = useAllRecipes();
  const { assignRecipe } = useWeeklyPlanStore();

  if (!isModalOpen) return null;

  const selectedRecipes = allRecipes.filter((r) =>
    plateRecipeIds.includes(r.id)
  );

  // 聚合所有已选菜品的食材清单
  const aggregatedIngredients: { key: string; name: string; amount?: string; dishName: string }[] = [];
  selectedRecipes.forEach((recipe) => {
    recipe.ingredients.forEach((ing) => {
      aggregatedIngredients.push({
        key: `${recipe.id}-${ing.name}`,
        name: ing.name,
        amount: ing.amount,
        dishName: recipe.name,
      });
    });
  });

  // 复制采购单到剪贴板
  const handleCopyShoppingList = async () => {
    if (selectedRecipes.length === 0) return;
    const dishNames = selectedRecipes.map((r) => r.name).join('、');
    const ingText = aggregatedIngredients
      .map((i) => (i.amount ? `${i.name}(${i.amount})` : i.name))
      .join('，');
    const text = `【今日家常菜单】${dishNames}\n【需备菜食材】${ingText}`;

    await Clipboard.setStringAsync(text);
    showToast('✅ 菜单与采购清单已复制，可直接发给家人！');
  };

  // 排入今日晚餐
  const handleScheduleDinner = () => {
    if (selectedRecipes.length === 0) return;
    const jsDay = new Date().getDay();
    const todayIndex = jsDay === 0 ? 6 : jsDay - 1;

    // 将第一道菜排入今日晚餐
    assignRecipe(todayIndex, 'dinner', selectedRecipes[0].id);
    // 如果有第二道排入午餐或记录
    if (selectedRecipes[1]) {
      assignRecipe(todayIndex, 'lunch', selectedRecipes[1].id);
    }

    closeModal();
    showToast('🎉 已成功排入「今日晚餐」计划！');
  };

  return (
    <Modal
      visible={isModalOpen}
      transparent
      animationType="slide"
      onRequestClose={closeModal}
    >
      <Pressable style={styles.overlay} onPress={closeModal}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            {/* 顶部标题栏 */}
            <View style={styles.header}>
              <View>
                <View style={styles.titleRow}>
                  <Text style={styles.titleEmoji}>🍽️</Text>
                  <Text style={styles.sheetTitle}>今日餐盘与备菜清单</Text>
                </View>
                <Text style={styles.sheetSubtitle}>
                  已自动合并计算所选菜品的全部配料
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeModal}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={Palette.inkMuted} />
              </TouchableOpacity>
            </View>

            {/* 可滚动内容区 */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 分段 1：已选菜品列表 */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  已选菜品 ({selectedRecipes.length})
                </Text>
                {selectedRecipes.length > 0 && (
                  <TouchableOpacity onPress={clearPlate} activeOpacity={0.7}>
                    <Text style={styles.clearBtnText}>清空餐盘</Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedRecipes.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Utensils size={36} color={Palette.inkLight} />
                  <Text style={styles.emptyText}>餐盘空空如也，快去挑选想吃的菜吧</Text>
                </View>
              ) : (
                <View style={styles.dishList}>
                  {selectedRecipes.map((dish) => (
                    <View key={dish.id} style={styles.dishCard}>
                      <View style={styles.dishThumbWrapper}>
                        <RecipeImage
                          coverImage={dish.coverImage}
                          name={dish.name}
                          category={dish.category}
                        />
                      </View>
                      <View style={styles.dishInfo}>
                        <Text style={styles.dishName} numberOfLines={1}>
                          {dish.name}
                        </Text>
                        <Text style={styles.dishMeta}>
                          {dish.category} · ⏱ {dish.cookTime}分钟
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeFromPlate(dish.id)}
                        style={styles.removeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.removeBtnText}>移除</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* 分段 2：冰箱备菜核对清单 */}
              {selectedRecipes.length > 0 && (
                <View style={styles.ingredientsBox}>
                  <View style={styles.ingHeader}>
                    <Text style={styles.ingTitle}>
                      🧺 冰箱备菜核对（点击可勾选已有食材）
                    </Text>
                  </View>

                  <View style={styles.ingGrid}>
                    {aggregatedIngredients.map((item) => {
                      const isChecked = Boolean(checkedIngredients[item.key]);
                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={[
                            styles.ingItem,
                            isChecked && styles.ingItemChecked,
                          ]}
                          onPress={() => toggleIngredientCheck(item.key)}
                          activeOpacity={0.75}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              isChecked && styles.checkboxChecked,
                            ]}
                          >
                            {isChecked && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                          </View>
                          <Text
                            style={[
                              styles.ingText,
                              isChecked && styles.ingTextChecked,
                            ]}
                            numberOfLines={1}
                          >
                            {item.name} {item.amount ? `(${item.amount})` : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* 底部操作条 */}
            {selectedRecipes.length > 0 && (
              <View style={styles.bottomBar}>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={handleCopyShoppingList}
                  activeOpacity={0.8}
                >
                  <Share2 size={14} color={Palette.primary} />
                  <Text style={styles.copyBtnText}>复制采购单</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.scheduleBtn}
                  onPress={handleScheduleDinner}
                  activeOpacity={0.85}
                >
                  <CalendarPlus size={15} color="#FFFFFF" />
                  <Text style={styles.scheduleBtnText}>排入今日晚餐</Text>
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// 全局浮动极简 Toast
export const GlobalTodayPlateToast: React.FC = () => {
  const { toastMessage } = useTodayPlateStore();
  if (!toastMessage) return null;

  return (
    <View style={styles.toastContainer} pointerEvents="none">
      <View style={styles.toastBubble}>
        <Check size={13} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 22, 18, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.canvas,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '84%',
    overflow: 'hidden',
  },
  safeArea: {
    paddingBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE4D8',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleEmoji: {
    fontSize: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.ink,
  },
  sheetSubtitle: {
    fontSize: 11,
    color: Palette.inkMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: Palette.tagWarm,
  },
  scrollArea: {
    maxHeight: 460,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.inkMuted,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 12,
    color: Palette.inkMuted,
  },
  dishList: {
    gap: 8,
  },
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  dishThumbWrapper: {
    width: 46,
    height: 46,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Palette.tagWarm,
  },
  dishInfo: {
    flex: 1,
  },
  dishName: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.ink,
  },
  dishMeta: {
    fontSize: 11,
    color: Palette.inkMuted,
    marginTop: 2,
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeBtnText: {
    fontSize: 11.5,
    color: Palette.inkMuted,
  },
  ingredientsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    gap: 10,
  },
  ingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ingTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.ink,
  },
  ingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: Palette.canvas,
    borderWidth: 1,
    borderColor: '#ECE4D8',
    gap: 6,
  },
  ingItemChecked: {
    backgroundColor: '#F5F3EF',
    borderColor: 'transparent',
  },
  checkbox: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Palette.inkLight,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  ingText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.ink,
    flex: 1,
  },
  ingTextChecked: {
    color: Palette.inkLight,
    textDecorationLine: 'line-through',
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECE4D8',
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.primary,
    gap: 6,
    backgroundColor: Palette.primarySoft,
  },
  copyBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.primary,
  },
  scheduleBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 16,
    backgroundColor: Palette.primary,
    gap: 6,
  },
  scheduleBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toastContainer: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 30, 28, 0.94)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    gap: 7,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
