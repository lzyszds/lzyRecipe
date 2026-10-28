import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { Palette } from '@/constants/theme';
import { AddToMealPlanModal } from '@/components/AddToMealPlanModal';
import { GlobalCustomFeedback } from '@/components/CustomFeedback';
import { AiGenerateConfirmSheet } from '@/components/AiGenerateConfirmSheet';
import { AppSplashScreen } from '@/components/AppSplashScreen';

// 阻止原生启动图过早消失，交由 AppSplashScreen 接管平滑转场
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ flex: 1 }} initialMetrics={initialWindowMetrics}>
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
        <Stack.Screen name="ai-compare" options={{ headerShown: false }} />
      </Stack>

      {/* 自选排入便当盒抽屉 */}
      <AddToMealPlanModal />

      {/* 全局统一自建弹窗与通知（彻底替代系统原生 Alert 与分散 Toast） */}
      <GlobalCustomFeedback />

      {/* 全局 AI 生成前确认层：二次确认 + 渠道商切换 + 补充要求输入 */}
      <AiGenerateConfirmSheet />

      {/* 手机端启动开屏动画：金色边缘轮廓线描画 ➔ 渐变平滑替换为 3D 渲染立体原图 */}
      <AppSplashScreen />
    </SafeAreaProvider>
  );
}
