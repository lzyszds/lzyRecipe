import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { getLocalCoverSource } from '../lib/coverAssets';
import { Palette } from '../constants/theme';

interface RecipeImageProps {
  coverImage?: string;
  name: string;
  category?: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

const CATEGORY_EMOJI: Record<string, string> = {
  川菜: '🌶️',
  粤菜: '🥘',
  湘菜: '🔥',
  鲁菜: '🥢',
  西餐: '🍽️',
  甜点: '🍰',
  饮品: '🥤',
  家常菜: '🏠',
  海鲜: '🦐',
  早餐: '🍳',
  汤: '🍲',
  肉类: '🥩',
  蔬菜: '🥬',
  主食: '🍜',
  调料: '🧂',
};

function getMorandiStyle(name: string, category?: string) {
  if (name.includes('番茄') || name.includes('西红柿')) return { emoji: '🍅', bg: '#EFDCD4' };
  if (name.includes('蛋')) return { emoji: '🍳', bg: '#F3EBD9' };
  if (/鱼|虾|蟹|海鲜|生蚝/.test(name)) return { emoji: '🦐', bg: '#DCE7EA' };
  if (/肉|鸡|鸭|牛|猪|排骨/.test(name)) return { emoji: '🥩', bg: '#ECDCD2' };
  if (/汤|羹/.test(name)) return { emoji: '🍲', bg: '#EAE4D6' };
  if (/面|饭|粉|粥/.test(name)) return { emoji: '🍜', bg: '#EEE5D8' };
  if (/青菜|茄子|豆腐|土豆/.test(name)) return { emoji: '🥬', bg: '#E3ECE6' };
  const catEmoji = category ? CATEGORY_EMOJI[category] : null;
  return { emoji: catEmoji || '🍲', bg: Palette.oat[100] };
}

import { useSettingsStore } from '../store/settingsStore';

export function resolveCoverUrl(coverImage?: string): string | null {
  if (!coverImage) return null;
  if (
    coverImage.startsWith('http://') ||
    coverImage.startsWith('https://') ||
    coverImage.startsWith('data:image/')
  ) {
    return coverImage;
  }
  const endpoint = (
    useSettingsStore.getState().sync?.endpoint?.trim() || 'https://sync.lzyszds.cn'
  ).replace(/\/+$/, '');
  const cleanPath = coverImage.startsWith('/') ? coverImage : `/${coverImage}`;
  return `${endpoint}${cleanPath}`;
}

export const RecipeImage: React.FC<RecipeImageProps> = ({
  coverImage,
  name,
  category,
  style,
  containerStyle,
}) => {
  const localSource = coverImage ? getLocalCoverSource(coverImage) : null;
  const remoteUrl = resolveCoverUrl(coverImage);

  if (localSource) {
    return (
      <Image
        source={localSource}
        style={[styles.image, style]}
        contentFit="cover"
        transition={200}
      />
    );
  }

  if (remoteUrl) {
    return (
      <Image
        source={{ uri: remoteUrl }}
        style={[styles.image, style]}
        contentFit="cover"
        transition={200}
      />
    );
  }

  // Fallback: 优雅莫兰迪色 Emoji 占位
  const morandi = getMorandiStyle(name, category);
  return (
    <View style={[styles.placeholder, { backgroundColor: morandi.bg }, containerStyle, style as ViewStyle]}>
      <Text style={styles.emoji}>{morandi.emoji}</Text>
      <Text style={styles.placeholderText} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.cocoa[700],
    textAlign: 'center',
  },
});
