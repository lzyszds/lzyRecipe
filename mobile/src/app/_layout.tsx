import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Palette } from '@/constants/theme';
import { AddToMealPlanModal, GlobalMealPlanToast } from '@/components/AddToMealPlanModal';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Palette.oat[50] },
          animation: 'none',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recipe/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="favorites" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="notes" options={{ headerShown: false }} />
      </Stack>
      {/* 全局加入餐盘选择抽屉 & 极简 Toast */}
      <AddToMealPlanModal />
      <GlobalMealPlanToast />
    </SafeAreaProvider>
  );
}
