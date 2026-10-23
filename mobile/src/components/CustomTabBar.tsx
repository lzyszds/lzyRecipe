import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  UtensilsCrossed,
  CalendarDays,
  User,
  Utensils,
  ChevronRight,
  ChevronDown,
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

  // 动画状态：0 为隐藏，1 为展开
  const anim = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);

  const openCapsule = () => {
    setIsOpen(true);
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 9,
    }).start();
  };

  const closeCapsule = () => {
    Animated.spring(anim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 9,
    }).start(() => {
      setIsOpen(false);
    });
  };

  const toggleCapsule = () => {
    if (isOpen) {
      closeCapsule();
    } else {
      openCapsule();
    }
  };

  // 当用户新加入菜品时，自动划出提示
  const prevCountRef = useRef(plateRecipeIds.length);
  useEffect(() => {
    if (plateRecipeIds.length > prevCountRef.current) {
      openCapsule();
    }
    prevCountRef.current = plateRecipeIds.length;
  }, [plateRecipeIds.length]);

  // 手势监听：按住底部工具栏区域，向上滑划出餐盘，向下滑收起餐盘
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // 垂直滑动距离大于 9px 且主要为垂直方向时接管手势（不影响正常的单个标签点击）
        return (
          Math.abs(gesture.dy) > 9 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2
        );
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -15) {
          // 向上划：拉出餐盘胶囊
          openCapsule();
        } else if (gesture.dy > 15) {
          // 向下划：收起餐盘胶囊
          closeCapsule();
        }
      },
    })
  ).current;

  // 胶囊动画插值
  const capsuleTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [38, 0],
  });

  const capsuleOpacity = anim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.3, 1],
  });

  const capsuleScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });

  return (
    <View
      style={[styles.floatingWrapper, { bottom: safeBottom }]}
      pointerEvents="box-none"
      {...panResponder.panHandlers}
    >
      {/* 1. 上方胶囊：今日餐盘（可向上拉出，向下拉关闭） */}
      <Animated.View
        style={[
          styles.capsuleAnimContainer,
          {
            transform: [
              { translateY: capsuleTranslateY },
              { scale: capsuleScale },
            ],
            opacity: capsuleOpacity,
          },
        ]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
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

          {/* 右侧微收起箭头 */}
          <TouchableOpacity
            style={styles.capsuleCloseBtn}
            onPress={(e) => {
              e.stopPropagation();
              closeCapsule();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronDown size={12} color="rgba(255, 255, 255, 0.55)" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>

      {/* 2. 下方胶囊：大尺寸宽幅路由菜单栏（支持上滑手势拉出餐盘） */}
      <View style={styles.wideNavDock}>
        {/* 顶部中央手柄线：提示可往上滑拉出，点击也可快速展开 */}
        <TouchableOpacity
          style={styles.pullHandle}
          onPress={toggleCapsule}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 6, left: 30, right: 30 }}
        >
          <View
            style={[
              styles.pullHandleBar,
              isOpen && styles.pullHandleBarActive,
            ]}
          />
        </TouchableOpacity>

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

          const iconColor = isFocused
            ? Palette.primary
            : 'rgba(255, 255, 255, 0.68)';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel}
              onPress={onPress}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
              activeOpacity={0.8}
            >
              <Icon
                size={17}
                color={iconColor}
                strokeWidth={isFocused ? 2.4 : 2}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {config.label}
              </Text>
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
    gap: 7, // 上下两胶囊之间舒适的垂直间隔
    zIndex: 99,
  },

  // 胶囊动画容器
  capsuleAnimContainer: {
    alignItems: 'center',
  },

  // 1. 上方悬浮餐盘胶囊
  plateFloatingCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.dockBg,
    borderRadius: 999,
    paddingVertical: 5.5,
    paddingLeft: 8,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(217, 107, 56, 0.35)',
    gap: 6,
  },
  capsuleCloseBtn: {
    paddingLeft: 4,
    paddingRight: 2,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
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

  // 2. 下方宽幅大尺寸路由导航栏（左右展开，所有项均显示图标 + 文字）
  wideNavDock: {
    width: '92%',
    maxWidth: 420,
    height: 56,
    backgroundColor: Palette.dockBg,
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 5,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  pullHandle: {
    position: 'absolute',
    top: 3,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    paddingVertical: 2,
  },
  pullHandleBar: {
    width: 28,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  pullHandleBarActive: {
    backgroundColor: 'rgba(217, 107, 56, 0.65)',
    width: 34,
  },
  tabItem: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 12,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: Palette.ink,
    fontWeight: '800',
  },
  tabLabelInactive: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontWeight: '600',
  },
});
