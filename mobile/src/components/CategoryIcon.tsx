import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { Palette } from '@/constants/theme';

interface CategoryIconProps {
  category: string;
  size?: number;
  color?: string;
  isActive?: boolean;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  size = 20,
  color = Palette.inkMuted,
  isActive = false,
}) => {
  const activeColor = Palette.primary;
  const iconColor = isActive ? activeColor : color;

  switch (category) {
    case '全部':
      // 灵感来自 icones.js.org: solar:widget-2-bold
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="3" width="7.5" height="7.5" rx="2.5" fill={iconColor} />
          <Rect x="13.5" y="3" width="7.5" height="7.5" rx="2.5" fill={iconColor} opacity={isActive ? 1 : 0.75} />
          <Rect x="3" y="13.5" width="7.5" height="7.5" rx="2.5" fill={iconColor} opacity={isActive ? 1 : 0.75} />
          <Rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.5" fill={iconColor} />
        </Svg>
      );

    case '川菜':
      // 灵感来自 icones.js.org: solar:pepper-bold / chili
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M17.5 3.5C16.5 2.5 14 3.5 13 4.5C11 6.5 8 10 7.5 13.5C7 17 9 20 12 20.5C15 21 17.5 18 18 14.5C18.5 11 17.5 7.5 17.5 3.5Z"
            fill={iconColor}
          />
          <Path
            d="M14.5 4C14.5 2.5 16 1.5 17 1"
            stroke={iconColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );

    case '粤菜':
      // 用户原型中的“煲”字徽标或广式煲仔砂锅
      return (
        <View
          style={[
            styles.textBadge,
            {
              backgroundColor: isActive ? Palette.primarySoft : Palette.tagWarm,
              borderColor: isActive ? Palette.primary : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.textBadgeText,
              { color: isActive ? Palette.primary : Palette.inkMuted },
            ]}
          >
            煲
          </Text>
        </View>
      );

    case '湘菜':
      // 灵感来自 icones.js.org: solar:flame-bold-duotone (火焰)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2C10.5 4.5 11 7 9.5 9C8 11 6 12 6 15C6 18.3 8.7 21 12 21C15.3 21 18 18.3 18 15C18 10.5 13 6.5 12 2Z"
            fill={iconColor}
          />
          <Path
            d="M12 18C10.9 18 10 17.1 10 16C10 14.5 11.2 13 12 12C12.8 13 14 14.5 14 16C14 17.1 13.1 18 12 18Z"
            fill={isActive ? '#FFFFFF' : Palette.canvas}
          />
        </Svg>
      );

    case '鲁菜':
      // 灵感来自 icones.js.org: solar:fish-bold (大明虾/海味)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 4C7.5 4 3.5 7.5 2 12C3.5 16.5 7.5 20 12 20C16 20 20.5 17.5 22 12C20.5 6.5 16 4 12 4ZM10 14C8.9 14 8 13.1 8 12C8 10.9 8.9 10 10 10C11.1 10 12 10.9 12 12C12 13.1 11.1 14 10 14ZM19 14C18 13 18 11 19 10C19.5 10.5 19.5 13.5 19 14Z"
            fill={iconColor}
          />
        </Svg>
      );

    case '家常菜':
      // 灵感来自 icones.js.org: solar:chef-hat-bold
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3C9.8 3 8 4.8 8 7C6.3 7 5 8.3 5 10C5 11.5 6.1 12.8 7.5 13L8 18H16L16.5 13C17.9 12.8 19 11.5 19 10C19 8.3 17.7 7 16 7C16 4.8 14.2 3 12 3Z"
            fill={iconColor}
          />
          <Rect x="7" y="19" width="10" height="2" rx="1" fill={iconColor} />
        </Svg>
      );

    case '海鲜':
      // 灵感来自 icones.js.org: mingcute:fish-fill
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 4C6.5 4 3 8.5 2 12C3 15.5 6.5 20 12 20C15 20 18.5 18 20 16L22 17V7L20 8C18.5 6 15 4 12 4ZM7 11C6.4 11 6 10.6 6 10C6 9.4 6.4 9 7 9C7.6 9 8 9.4 8 10C8 10.6 7.6 11 7 11Z"
            fill={iconColor}
          />
        </Svg>
      );

    case '肉类':
      // 灵感来自 icones.js.org: solar:bone-bold
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M19.5 7.5C18.5 6.5 17 6.5 16 7.5L8.5 15C7.5 14 5.5 14 4.5 15C3.5 16 3.5 18 4.5 19C5.5 20 7.5 20 8.5 19L16 11.5C17 12.5 19 12.5 20 11.5C21 10.5 21 8.5 19.5 7.5Z"
            fill={iconColor}
          />
        </Svg>
      );

    case '汤':
    case '汤羹':
      // 灵感来自 icones.js.org: solar:soup-bold (碗与热气)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 11C4 15.4 7.6 19 12 19C16.4 19 20 15.4 20 11H4Z"
            fill={iconColor}
          />
          <Rect x="8" y="20" width="8" height="2" rx="1" fill={iconColor} />
          <Path
            d="M8 4C8 6 9 7 9 8M12 3C12 5.5 13 6.5 13 8M16 4C16 6 17 7 17 8"
            stroke={iconColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </Svg>
      );

    case '蔬菜':
      // 灵感来自 icones.js.org: solar:leaf-bold
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20.5 3.5C15 3.5 9 7 7 12C5 17 6.5 20.5 6.5 20.5C6.5 20.5 10 22 15 20C20 18 20.5 12 20.5 3.5Z"
            fill={iconColor}
          />
          <Path
            d="M6.5 20.5L13.5 13.5"
            stroke={isActive ? '#FFFFFF' : Palette.canvas}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );

    case '早餐':
      // 灵感来自 icones.js.org: solar:sun-2-bold
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="5" fill={iconColor} />
          <Path
            d="M12 2V4M12 20V22M4 12H2M22 12H20M5 5L6.5 6.5M17.5 17.5L19 19M5 19L6.5 17.5M17.5 6.5L19 5"
            stroke={iconColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );

    case '西餐':
      // 灵感来自 icones.js.org: solar:fork-spoon-bold
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 3V8C6 9.7 7.3 11 9 11V21H11V11C12.7 11 14 9.7 14 8V3H12V7H11V3H9V7H8V3H6Z"
            fill={iconColor}
          />
          <Path
            d="M18 3C16.3 3 15 4.8 15 7C15 8.9 16.1 10.4 17.5 10.9V21H19.5V10.9C20.9 10.4 22 8.9 22 7C22 4.8 20.7 3 18 3Z"
            fill={iconColor}
          />
        </Svg>
      );

    case '甜点':
      // 灵感来自 icones.js.org: solar:donut-bold
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" fill={iconColor} />
          <Circle cx="12" cy="12" r="3.5" fill={isActive ? '#FFFFFF' : Palette.canvas} />
          <Circle cx="12" cy="5.5" r="1" fill={isActive ? '#FFFFFF' : Palette.canvas} />
          <Circle cx="17.5" cy="10" r="1" fill={isActive ? '#FFFFFF' : Palette.canvas} />
          <Circle cx="15.5" cy="16.5" r="1" fill={isActive ? '#FFFFFF' : Palette.canvas} />
        </Svg>
      );

    case '饮品':
      // 灵感来自 icones.js.org: solar:cup-hot-bold
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 8V15C4 18.3 6.7 21 10 21H12C15.3 21 18 18.3 18 15V8H4ZM18 10H19C20.1 10 21 10.9 21 12C21 13.1 20.1 14 19 14H18V10Z"
            fill={iconColor}
          />
          <Path
            d="M8 3V5M11 2V5M14 3V5"
            stroke={iconColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </Svg>
      );

    case '主食':
      // 灵感来自 icones.js.org: solar:bowl-bold
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 10C3 15 6.5 19 11 19.8V21H13V19.8C17.5 19 21 15 21 10H3Z"
            fill={iconColor}
          />
          <Path
            d="M5 6L19 4"
            stroke={iconColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );

    default:
      // 通用美观餐具图标
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" fill={iconColor} />
          <Circle cx="12" cy="12" r="6" stroke="#FFFFFF" strokeWidth="1.5" />
        </Svg>
      );
  }
};

const styles = StyleSheet.create({
  textBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  textBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
