import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { UtensilsCrossed } from 'lucide-react-native';
import { Palette, Radius } from '@/constants/theme';

/** 未匹配路由的兜底页（Expo Router 约定文件名为 +not-found.tsx） */
export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '页面不存在' }} />

      <View style={styles.iconWrapper}>
        <UtensilsCrossed size={34} color={Palette.cocoa[700]} />
      </View>

      <Text style={styles.title}>这道菜还没上桌</Text>
      <Text style={styles.desc}>页面走丢了，回首页看看别的菜谱吧。</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace('/')}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>回到首页</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.canvas,
    paddingHorizontal: 32,
    gap: 12,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.oat[100],
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.ink,
  },
  desc: {
    fontSize: 13,
    color: Palette.inkMuted,
    textAlign: 'center',
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: Radius.md,
    backgroundColor: Palette.cocoa[700],
  },
  buttonText: {
    color: Palette.card,
    fontSize: 14,
    fontWeight: '600',
  },
});
