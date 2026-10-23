import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Palette } from '@/constants/theme';
import { AddToMealPlanModal, GlobalMealPlanToast } from '@/components/AddToMealPlanModal';
import { TodayPlateModal, GlobalTodayPlateToast } from '@/components/TodayPlateModal';

export default function RootLayout() {
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
      <GlobalTodayPlateToast />

      {/* 周计划自选排餐抽屉 */}
      <AddToMealPlanModal />
      <GlobalMealPlanToast />
    </SafeAreaProvider>
  );
}
