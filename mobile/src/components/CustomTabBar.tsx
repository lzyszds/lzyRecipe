import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  UtensilsCrossed,
  CalendarDays,
  User,
  Utensils,
  ChevronRight,
} from 'lucide-react-native';
import { useTodayPlateStore } from '@/store/todayPlateStore';
import { useAllRecipes } from '@/lib/recipes';
import { RecipeImage } from './RecipeImage';
import { Palette } from '@/constants/theme';

const TAB_CONFIG: Record<
  string,
  { label: string; icon: React.FC<{ size: number; color: string; strokeWidth?: number }> }
> = {
  index: { label: '首页', icon: Home },
  recipes: { label: '菜谱', icon: UtensilsCrossed },
  'weekly-plan': { label: '计划', icon: CalendarDays },
  profile: { label: '我的', icon: User },
};

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigateToTab?: (routeKey: string) => void;
  navigation?: any;
}

export const CustomTabBar: React.FC<CustomTabBarProps> = ({
  state,
  descriptors,
  navigateToTab,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 10);

  const { plateRecipeIds, openModal } = useTodayPlateStore();
  const allRecipes = useAllRecipes();

  const selectedRecipes = allRecipes.filter((r) =>
    plateRecipeIds.includes(r.id)
  );

  const totalIngredientsCount = selectedRecipes.reduce(
    (sum, r) => sum + r.ingredients.length,
    0
  );

  return (
    <View
      style={[styles.floatingWrapper, { bottom: safeBottom + 2 }]}
      pointerEvents="box-none"
    >
      {/* 1. 上方胶囊：今日餐盘独立悬浮胶囊（专业双胶囊交互） */}
      <TouchableOpacity
        style={styles.plateFloatingCapsule}
        onPress={openModal}
        activeOpacity={0.88}
      >
        {/* 头像叠放 */}
        <View style={styles.avatarStack}>
          {selectedRecipes.length === 0 ? (
            <View style={styles.emptyAvatar}>
              <Utensils size={11} color={Palette.primary} />
            </View>
          ) : (
            selectedRecipes.slice(0, 2).map((item, idx) => (
              <View
                key={item.id}
                style={[
                  styles.avatarWrapper,
                  idx > 0 && { marginLeft: -8 },
                ]}
              >
                <RecipeImage
                  coverImage={item.coverImage}
                  name={item.name}
                  category={item.category}
                />
              </View>
            ))
          )}
        </View>

        {/* 标题与数量药丸 */}
        <Text style={styles.plateCapsuleTitle}>今日餐盘</Text>
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>{selectedRecipes.length}道</Text>
        </View>

        {/* 微分割线 */}
        <View style={styles.capsuleDivider} />

        {/* 备菜概览与前进图标 */}
        <Text style={styles.plateCapsuleSub} numberOfLines={1}>
          {selectedRecipes.length === 0
            ? '挑选美味'
            : `备菜 ${totalIngredientsCount} 项`}
        </Text>
        <ChevronRight size={13} color="rgba(255, 255, 255, 0.7)" />
      </TouchableOpacity>

      {/* 2. 下方胶囊：纯净现代路由导航栏（无杂质，优雅居中） */}
      <View style={styles.navDockContainer}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] || {
            label: options?.title || route.name,
            icon: Home,
          };
          const Icon = config.icon;

          const onPress = () => {
            if (!isFocused) {
              if (navigateToTab) {
                navigateToTab(route.key);
              } else if (navigation) {
                navigation.navigate(route.name);
              }
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel}
              onPress={onPress}
              style={[styles.navPill, isFocused && styles.navPillActive]}
              activeOpacity={0.8}
            >
              <Icon
                size={17}
                color={isFocused ? Palette.primary : 'rgba(255, 255, 255, 0.65)'}
                strokeWidth={isFocused ? 2.3 : 2}
              />
              {isFocused && (
                <Text style={styles.navTextActive}>{config.label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8, // 上下两胶囊之间优雅间距
    zIndex: 99,
  },

  // 1. 上方悬浮餐盘胶囊
  plateFloatingCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.dockBg,
    borderRadius: 999,
    paddingVertical: 5,
    paddingLeft: 7,
    paddingRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(217, 107, 56, 0.35)', // 焦糖柿子微流光边框
    gap: 6,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: Palette.primarySoft,
  },
  emptyAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateCapsuleTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  badgePill: {
    backgroundColor: Palette.primary,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 11,
  },
  capsuleDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 1,
  },
  plateCapsuleSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },

  // 2. 下方纯净路由胶囊 Dock
  navDockContainer: {
    backgroundColor: Palette.dockBg,
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  navPillActive: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  navTextActive: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Palette.ink,
  },
});
