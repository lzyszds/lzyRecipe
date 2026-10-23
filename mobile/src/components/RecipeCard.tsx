import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { Recipe, DifficultyLevel } from '../types';
import { RecipeImage } from './RecipeImage';
import { useFavoritesStore } from '../store/favoritesStore';
import { useWeeklyPlanStore } from '../store/weeklyPlanStore';
import { Palette } from '../constants/theme';

interface RecipeCardProps {
  recipe: Recipe;
  compact?: boolean;
}

const difficultyLabel: Record<DifficultyLevel, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, compact }) => {
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
      // 成功加入提示
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={handlePress}
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
            {recipe.description || recipe.ingredients.slice(0, 3).map((i) => i.name).join('、')}
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
            color={favorite ? Palette.apricot[500] : Palette.cocoa[400]}
            fill={favorite ? Palette.apricot[500] : 'transparent'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
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
            size={15}
            color={favorite ? Palette.apricot[500] : '#FFFFFF'}
            fill={favorite ? Palette.apricot[500] : 'rgba(0,0,0,0.25)'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {recipe.name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            {recipe.category} · {recipe.cookTime}分
          </Text>
          <TouchableOpacity
            style={styles.addPlanBtn}
            onPress={handleAddToPlan}
          >
            <Text style={styles.addPlanBtnText}>+ 餐盘</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: Palette.oat[100],
    shadowColor: Palette.cocoa[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flex: 1,
  },
  imageContainer: {
    height: 116,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Palette.oat[100],
    position: 'relative',
  },
  floatingHeart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  body: {
    paddingTop: 8,
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  metaText: {
    fontSize: 11,
    color: Palette.cocoa[400],
    flex: 1,
  },
  addPlanBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Palette.apricot[50],
    borderWidth: 1,
    borderColor: Palette.apricot[200],
  },
  addPlanBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.apricot[600],
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Palette.oat[100],
    shadowColor: Palette.cocoa[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 10,
  },
  compactImageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Palette.oat[100],
  },
  compactContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  compactDesc: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 3,
  },
  compactMeta: {
    fontSize: 10,
    color: Palette.cocoa[400],
    marginTop: 4,
  },
  heartButton: {
    padding: 6,
  },
});
