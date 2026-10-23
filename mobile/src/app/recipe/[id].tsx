import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Heart,
  Clock,
  Flame,
  CheckCircle2,
  Circle,
  CalendarPlus,
  Lightbulb,
  Camera,
  Edit3,
  ZoomIn,
} from 'lucide-react-native';
import { useAllRecipes } from '@/lib/recipes';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useMealPlanSheetStore } from '@/store/mealPlanSheetStore';
import { useImportedRecipesStore } from '@/store/importedRecipesStore';
import { toast } from '@/store/feedbackStore';
import { RecipeImage } from '@/components/RecipeImage';
import { RecipeCoverModal } from '@/components/RecipeCoverModal';
import { RecipeEditModal } from '@/components/RecipeEditModal';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { DifficultyLevel } from '@/types';
import { Palette, Radius } from '@/constants/theme';

const difficultyConfig: Record<DifficultyLevel, { label: string }> = {
  easy: { label: '简单' },
  medium: { label: '中等' },
  hard: { label: '困难' },
};

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const allRecipes = useAllRecipes();
  const recipe = allRecipes.find((r) => r.id === id);

  const { isFavorite, toggleFavorite } = useFavoritesStore();

  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [coverModalVisible, setCoverModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [previewImageVisible, setPreviewImageVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  if (!recipe) {
    return (
      <SafeAreaView style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>未找到该菜谱</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回上一页</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const favorite = isFavorite(recipe.id);
  const difficulty = difficultyConfig[recipe.difficulty] || { label: '普通' };

  // 微信式滚动渐变动画：导航栏背景与标题无缝浮现
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [20, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerBorderOpacity = scrollY.interpolate({
    inputRange: [70, 110],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [50, 110],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const toggleIngredient = (index: number) => {
    const next = new Set(checkedIngredients);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setCheckedIngredients(next);
  };

  const handleAddToWeeklyPlan = () => {
    useMealPlanSheetStore.getState().openSheet(recipe);
  };

  return (
    <View style={styles.screen}>
      {/* 微信式置顶固定导航栏（永不随滚动脱离画面） */}
      <View style={styles.fixedNavBar}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.navBarBackground,
            { opacity: headerBgOpacity },
          ]}
        />
        <Animated.View
          style={[
            styles.navBarBorder,
            { opacity: headerBorderOpacity },
          ]}
        />
        <SafeAreaView edges={['top']} style={styles.navBarSafeArea}>
          <View style={styles.navBarRow}>
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <ArrowLeft size={18} color={Palette.cocoa[900]} />
            </TouchableOpacity>

            <Animated.Text
              style={[styles.navBarTitle, { opacity: titleOpacity }]}
              numberOfLines={1}
            >
              {recipe.name}
            </Animated.Text>

            <View style={styles.topRightActions}>
              <TouchableOpacity
                style={styles.iconCircle}
                onPress={() => setEditModalVisible(true)}
                activeOpacity={0.8}
              >
                <Edit3 size={16} color={Palette.cocoa[700]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconCircle}
                onPress={() => toggleFavorite(recipe.id)}
                activeOpacity={0.8}
              >
                <Heart
                  size={18}
                  color={favorite ? Palette.apricot[500] : Palette.cocoa[700]}
                  fill={favorite ? Palette.apricot[500] : 'transparent'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* 顶部大封面 */}
        <View style={styles.coverWrapper}>
          <TouchableOpacity
            style={styles.coverImagePressable}
            activeOpacity={0.92}
            onPress={() => setPreviewImageVisible(true)}
          >
            <RecipeImage
              coverImage={recipe.coverImage}
              name={recipe.name}
              category={recipe.category}
            />
          </TouchableOpacity>

          {/* 放大预览按钮 */}
          <TouchableOpacity
            style={styles.zoomPreviewBtn}
            onPress={() => setPreviewImageVisible(true)}
            activeOpacity={0.85}
          >
            <ZoomIn size={12} color="#FFFFFF" />
            <Text style={styles.zoomPreviewText}>大图</Text>
          </TouchableOpacity>

          {/* 更换封面按钮 */}
          <TouchableOpacity
            style={styles.changeCoverBtn}
            onPress={() => setCoverModalVisible(true)}
            activeOpacity={0.85}
          >
            <Camera size={13} color="#FFFFFF" />
            <Text style={styles.changeCoverText}>更换封面</Text>
          </TouchableOpacity>
        </View>

        {/* 菜谱主信息卡 */}
        <View style={styles.mainInfoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.recipeTitle}>{recipe.name}</Text>
          </View>

          <View style={styles.tagRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{recipe.category}</Text>
            </View>
            <View style={styles.tagItem}>
              <Clock size={12} color={Palette.cocoa[400]} />
              <Text style={styles.tagText}>{recipe.cookTime} 分钟</Text>
            </View>
            <View style={styles.tagItem}>
              <Flame size={12} color={Palette.apricot[500]} />
              <Text style={styles.tagText}>{difficulty.label}</Text>
            </View>
          </View>

          {Boolean(recipe.description) && (
            <Text style={styles.descriptionText}>{recipe.description}</Text>
          )}
        </View>

        {/* 食材清单 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>备料清单</Text>
            <Text style={styles.sectionHint}>
              已备好 {checkedIngredients.size}/{recipe.ingredients.length} 项
            </Text>
          </View>

          <View style={styles.ingredientsList}>
            {recipe.ingredients.map((ing, idx) => {
              const isChecked = checkedIngredients.has(idx);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.ingredientRow, isChecked && styles.ingredientRowChecked]}
                  onPress={() => toggleIngredient(idx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.ingLeft}>
                    {isChecked ? (
                      <CheckCircle2 size={16} color={Palette.apricot[500]} />
                    ) : (
                      <Circle size={16} color={Palette.cocoa[200]} />
                    )}
                    <Text
                      style={[
                        styles.ingName,
                        isChecked && styles.ingNameChecked,
                      ]}
                    >
                      {ing.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.ingAmount,
                      isChecked && styles.ingAmountChecked,
                    ]}
                  >
                    {ing.amount}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 烹饪步骤 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>制作步骤</Text>
          <View style={styles.stepsList}>
            {recipe.steps.map((step, idx) => (
              <View key={idx} style={styles.stepItem}>
                <View style={styles.stepOrderBadge}>
                  <Text style={styles.stepOrderText}>{step.order || idx + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepDesc}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 贴士 */}
        {Boolean(recipe.tips) && (
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Lightbulb size={16} color={Palette.apricot[600]} />
              <Text style={styles.tipsTitle}>大厨小贴士</Text>
            </View>
            <Text style={styles.tipsContent}>{recipe.tips}</Text>
          </View>
        )}
      </Animated.ScrollView>

      {/* 底部固定操作栏 */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <TouchableOpacity
          style={styles.editRecipeBtn}
          onPress={() => setEditModalVisible(true)}
          activeOpacity={0.8}
        >
          <Edit3 size={15} color={Palette.cocoa[900]} />
          <Text style={styles.editRecipeBtnText}>编辑菜谱</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.schedulePlanBtn}
          onPress={handleAddToWeeklyPlan}
          activeOpacity={0.85}
        >
          <CalendarPlus size={16} color="#FFFFFF" />
          <Text style={styles.schedulePlanBtnText}>排入便当盒</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* 封面替换弹窗 */}
      <RecipeCoverModal
        visible={coverModalVisible}
        onClose={() => setCoverModalVisible(false)}
        recipeName={recipe.name}
        category={recipe.category}
        currentCover={recipe.coverImage}
        onSelectCover={(newCover) => {
          useImportedRecipesStore
            .getState()
            .updateImportedRecipeCover(recipe.id, newCover, recipe);
        }}
      />

      {/* 菜谱编辑弹窗 */}
      <RecipeEditModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        recipe={recipe}
      />

      {/* 高清大图放大预览弹窗 */}
      <ImagePreviewModal
        visible={previewImageVisible}
        onClose={() => setPreviewImageVisible(false)}
        coverImage={recipe.coverImage}
        title={recipe.name}
        category={recipe.category}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.oat[50],
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  coverWrapper: {
    width: '100%',
    height: 240,
    backgroundColor: Palette.oat[100],
    position: 'relative',
  },
  fixedNavBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  navBarBackground: {
    backgroundColor: Palette.canvas,
  },
  navBarBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.dockBorder,
  },
  navBarSafeArea: {
    width: '100%',
  },
  navBarRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  navBarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Palette.cocoa[900],
    textAlign: 'center',
    marginHorizontal: 10,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  mainInfoCard: {
    backgroundColor: '#FFFFFF',
    marginTop: -16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.oat[100],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  badge: {
    backgroundColor: Palette.apricot[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.apricot[600],
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  descriptionText: {
    fontSize: 12,
    lineHeight: 18,
    color: Palette.cocoa[700],
    marginTop: 10,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.oat[100],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  sectionHint: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  ingredientsList: {
    gap: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.oat[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ingredientRowChecked: {
    opacity: 0.5,
  },
  ingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingName: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.cocoa[900],
  },
  ingNameChecked: {
    textDecorationLine: 'line-through',
    color: Palette.cocoa[400],
  },
  ingAmount: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.cocoa[700],
  },
  ingAmountChecked: {
    textDecorationLine: 'line-through',
    color: Palette.cocoa[400],
  },
  stepsList: {
    gap: 14,
    marginTop: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepOrderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.apricot[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepOrderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: Palette.cocoa[700],
  },
  tipsCard: {
    backgroundColor: Palette.apricot[50],
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.apricot[100],
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.apricot[600],
  },
  tipsContent: {
    fontSize: 12,
    lineHeight: 18,
    color: Palette.cocoa[700],
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECE4D8',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: 'row',
    gap: 10,
  },
  coverImagePressable: {
    width: '100%',
    height: '100%',
  },
  zoomPreviewBtn: {
    position: 'absolute',
    bottom: 28,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 30, 28, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  zoomPreviewText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  changeCoverBtn: {
    position: 'absolute',
    bottom: 28,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 30, 28, 0.78)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  changeCoverText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editRecipeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.oat[100],
    borderRadius: 16,
    height: 44,
    gap: 6,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
  },
  editRecipeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  schedulePlanBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 16,
    height: 44,
    gap: 6,
  },
  schedulePlanBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 14,
    color: Palette.cocoa[400],
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Palette.apricot[500],
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
