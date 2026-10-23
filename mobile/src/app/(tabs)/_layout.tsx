import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false, // 预加载所有底栏页面，杜绝首次切换卡顿与冷启动延迟
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: '菜谱',
        }}
      />
      <Tabs.Screen
        name="weekly-plan"
        options={{
          title: '周计划',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
        }}
      />
    </Tabs>
  );
}
