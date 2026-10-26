import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { Palette } from '../constants/theme';
import { UtensilsCrossed } from 'lucide-react-native';

interface RecipeImageProps {
  coverImage?: string;
  name: string;
  category?: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

function getMorandiBg(name: string) {
  if (name.includes('番茄') || name.includes('西红柿')) return '#EFDCD4';
  if (name.includes('蛋')) return '#F3EBD9';
  if (/鱼|虾|蟹|海鲜|生蚝/.test(name)) return '#DCE7EA';
  if (/肉|鸡|鸭|牛|猪|排骨/.test(name)) return '#ECDCD2';
  if (/汤|羹/.test(name)) return '#EAE4D6';
  if (/面|饭|粉|粥/.test(name)) return '#EEE5D8';
  if (/青菜|茄子|豆腐|土豆/.test(name)) return '#E3ECE6';
  return Palette.oat[100];
}

export function resolveCoverUrl(coverImage?: string): string | null {
  if (!coverImage) return null;
  const trimmed = coverImage.trim();
  // base64 数据图不再展示（体积大、拖慢加载与云同步），统一按缺图处理，交由手动/自动补全
  if (trimmed.startsWith('data:')) return null;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  return null;
}

export const RecipeImage: React.FC<RecipeImageProps> = ({
  coverImage,
  name,
  category,
  style,
  containerStyle,
}) => {
  const remoteUrl = resolveCoverUrl(coverImage);

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

  // Fallback: 优雅莫兰迪色图标占位
  const bg = getMorandiBg(name);
  return (
    <View style={[styles.placeholder, { backgroundColor: bg }, containerStyle, style as ViewStyle]}>
      <UtensilsCrossed size={24} color={Palette.cocoa[700]} />
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
    gap: 6,
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.cocoa[700],
    textAlign: 'center',
  },
});
