import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Clock, Plus } from 'lucide-react-native';
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
      Alert.alert('已加入餐盘', `「${recipe.name}」已添加至本周计划！`);
    } else {
      Alert.alert('提示', '本周餐盘已满，可前往周计划调整');
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

  // 大图杂志双列卡片
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
            fill={favorite ? Palette.apricot[500] : 'rgba(0,0,0,0.3)'}
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
            onPress={handleAddToPlan}
            activeOpacity={0.8}
          >
            <Plus size={11} color={Palette.apricot[600]} />
            <Text style={styles.addPlanBtnText}>餐盘</Text>
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
    borderColor: '#F2ECE5',
    shadowColor: '#2C221C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flex: 1,
  },
  imageContainer: {
    height: 130,
    borderRadius: 12,
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  timeBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  timeBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  body: {
    paddingTop: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Palette.cocoa[900],
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  categoryBadge: {
    backgroundColor: Palette.oat[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  addPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Palette.apricot[50],
    borderWidth: 1,
    borderColor: Palette.apricot[200],
    gap: 2,
  },
  addPlanBtnText: {
    fontSize: 10,
    fontWeight: '700',
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
