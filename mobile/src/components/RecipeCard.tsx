import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Clock, CalendarPlus } from 'lucide-react-native';
import { Recipe, DifficultyLevel } from '../types';
import { RecipeImage } from './RecipeImage';
import { useFavoritesStore } from '../store/favoritesStore';
import { useMealPlanSheetStore } from '../store/mealPlanSheetStore';
import { toast } from '../store/feedbackStore';
import { Palette } from '../constants/theme';

interface RecipeCardProps {
  recipe: Recipe;
  compact?: boolean;
}

const difficultyLabel: Record<DifficultyLevel, string> = {
  easy: '简单',
  medium: '家常',
  hard: '进阶',
};

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, compact }) => {
  const router = useRouter();
  // 响应式订阅收藏数组：React Compiler 下用 get() 型方法取值会被缓存导致红心不高亮
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const favorite = favorites.includes(recipe.id);

  const handlePress = () => {
    router.push({
      pathname: '/recipe/[id]',
      params: { id: recipe.id },
    });
  };

  const handleToggleFavorite = (e: any) => {
    e?.stopPropagation?.();
    toggleFavorite(recipe.id);
    toast({
      type: 'info',
      message: favorite ? '已取消收藏' : `已收藏「${recipe.name}」`,
    });
  };

  const handleOpenPlanModal = (e: any) => {
    e?.stopPropagation?.();
    useMealPlanSheetStore.getState().openSheet(recipe);
  };

  const handleLongPress = () => {
    useMealPlanSheetStore.getState().openSheet(recipe);
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.85}
      >
        <View style={styles.compactImageWrapper}>
          <RecipeImage
            coverImage={recipe.coverImage}
            name={recipe.name}
            category={recipe.category}
          />
        </View>

        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {recipe.name}
          </Text>
          <Text style={styles.compactDesc} numberOfLines={1}>
            {recipe.description ||
              recipe.ingredients
                .slice(0, 3)
                .map((i) => i.name)
                .join('、')}
          </Text>
          <Text style={styles.compactMeta}>
            {recipe.category} · {recipe.cookTime}分钟 · {difficultyLabel[recipe.difficulty]}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.heartButton}
          onPress={handleToggleFavorite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Heart
            size={18}
            color={favorite ? Palette.roseWarm : Palette.inkMuted}
            fill={favorite ? Palette.roseWarm : 'transparent'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // 大图杂志双列卡片
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.88}
    >
      <View style={styles.imageContainer}>
        <RecipeImage
          coverImage={recipe.coverImage}
          name={recipe.name}
          category={recipe.category}
        />

        <TouchableOpacity
          style={styles.floatingHeart}
          onPress={handleToggleFavorite}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Heart
            size={14}
            color={favorite ? Palette.roseWarm : Palette.inkMuted}
            fill={favorite ? Palette.roseWarm : 'transparent'}
          />
        </TouchableOpacity>

        {/* 封面下方的时长小药丸 */}
        <View style={styles.timeBadge}>
          <Clock size={10} color="#FFFFFF" />
          <Text style={styles.timeBadgeText}>{recipe.cookTime}分</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {recipe.name}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{recipe.category}</Text>
          </View>
          <TouchableOpacity
            style={styles.addPlanBtn}
            onPress={handleOpenPlanModal}
            activeOpacity={0.8}
          >
            <CalendarPlus size={11} color={Palette.primary} strokeWidth={2.5} />
            <Text style={styles.addPlanBtnText}>排餐</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 7,
    borderWidth: 1,
    borderColor: '#F0E9DF',
    flex: 1,
  },
  imageContainer: {
    height: 125,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Palette.tagWarm,
    position: 'relative',
  },
  floatingHeart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 30, 28, 0.72)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  timeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  body: {
    paddingTop: 8,
    paddingBottom: 2,
    paddingHorizontal: 2,
    gap: 5,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: Palette.tagWarm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.inkMuted,
  },
  addPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    gap: 2,
  },
  addPlanBtnActive: {
    backgroundColor: Palette.primary,
  },
  addPlanBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Palette.primary,
  },
  addPlanBtnTextActive: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 紧凑卡片 (用于搜索和列表)
  compactCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#F0E9DF',
  },
  compactImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Palette.tagWarm,
  },
  compactContent: {
    flex: 1,
    gap: 2,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.ink,
  },
  compactDesc: {
    fontSize: 11,
    color: Palette.inkMuted,
  },
  compactMeta: {
    fontSize: 10,
    color: Palette.inkLight,
  },
  heartButton: {
    padding: 8,
  },
});
