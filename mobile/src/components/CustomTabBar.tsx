import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, UtensilsCrossed, CalendarDays, User } from 'lucide-react-native';
import { Palette } from '@/constants/theme';

const TAB_CONFIG: Record<
  string,
  { label: string; icon: React.FC<{ size: number; color: string }> }
> = {
  index: { label: '首页', icon: Home },
  recipes: { label: '菜谱', icon: UtensilsCrossed },
  'weekly-plan': { label: '周计划', icon: CalendarDays },
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
  // 底部安全距离：精准贴合 Android / iOS 全面屏小黑条，绝不压字！
  const safeBottom = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: safeBottom }]}>
      <View style={styles.tabBarContainer}>
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

          const activeColor = Palette.apricot[500];
          const inactiveColor = Palette.cocoa[400];

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  isFocused && styles.iconContainerActive,
                ]}
              >
                <Icon
                  size={20}
                  color={isFocused ? activeColor : inactiveColor}
                />
              </View>
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
  tabBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDE5DB',
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: 54,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 36,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: Palette.apricot[50],
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: Palette.apricot[600],
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: Palette.cocoa[400],
    fontWeight: '500',
  },
});
