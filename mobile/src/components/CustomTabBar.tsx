import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, UtensilsCrossed, CalendarDays, User, Utensils } from 'lucide-react-native';
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
  const safeBottom = Math.max(insets.bottom, 12);

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
      <View style={styles.dockContainer}>
        {/* 左侧：胶囊滑动式路由栏 */}
        <View style={styles.navRow}>
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
                  size={16}
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

        {/* 中间微分割线 */}
        <View style={styles.divider} />

        {/* 右侧：内嵌式“今日餐盘”胶囊按钮 */}
        <TouchableOpacity
          style={styles.plateBtn}
          onPress={openModal}
          activeOpacity={0.85}
        >
          {/* 头像叠放或空图标 */}
          <View style={styles.avatarStack}>
            {selectedRecipes.length === 0 ? (
              <View style={styles.emptyAvatar}>
                <Utensils size={12} color="#FFFFFF" />
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

          {/* 状态与数量文字 */}
          <View style={styles.plateInfo}>
            <View style={styles.plateTitleRow}>
              <Text style={styles.plateTitleText}>餐盘</Text>
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>{selectedRecipes.length}</Text>
              </View>
            </View>
            <Text style={styles.plateSubText} numberOfLines={1}>
              {selectedRecipes.length === 0
                ? '点选菜品'
                : `备菜 ${totalIngredientsCount} 项`}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99,
  },
  dockContainer: {
    backgroundColor: Palette.dockBg,
    borderRadius: 26,
    padding: 6,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 2,
  },
  navPill: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  navPillActive: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  navTextActive: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.ink,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 4,
  },
  plateBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 20,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: Palette.primarySoft,
  },
  emptyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateInfo: {
    justifyContent: 'center',
  },
  plateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  plateTitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 13,
  },
  badgePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 0.5,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 11,
  },
  plateSubText: {
    fontSize: 8.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
    lineHeight: 10,
  },
});
