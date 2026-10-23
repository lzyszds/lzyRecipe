import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Palette } from '@/constants/theme';
import { AddToMealPlanModal } from '@/components/AddToMealPlanModal';
import { TodayPlateModal } from '@/components/TodayPlateModal';
import { GlobalCustomFeedback } from '@/components/CustomFeedback';
import { startAutoSync } from '@/lib/cloudSync';

export default function RootLayout() {
  useEffect(() => {
    startAutoSync();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Palette.canvas },
          animation: 'none',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recipe/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="favorites" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="notes" options={{ headerShown: false }} />
      </Stack>

      {/* 今日餐盘与备菜清单抽屉 */}
      <TodayPlateModal />

      {/* 周计划自选排餐抽屉 */}
      <AddToMealPlanModal />

      {/* 全局统一自建弹窗与通知（彻底替代系统原生 Alert 与分散 Toast） */}
      <GlobalCustomFeedback />
    </SafeAreaProvider>
  );
}
