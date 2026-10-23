import { Tabs } from 'expo-router';
import { Home, UtensilsCrossed, CalendarDays, User } from 'lucide-react-native';
import { Platform } from 'react-native';
import { Palette } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Palette.apricot[500],
        tabBarInactiveTintColor: Palette.cocoa[400],
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: Palette.oat[100],
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          elevation: 8,
          shadowColor: Palette.cocoa[900],
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color, size }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: '菜谱',
          tabBarIcon: ({ color, size }) => <UtensilsCrossed size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="weekly-plan"
        options={{
          title: '周计划',
          tabBarIcon: ({ color, size }) => <CalendarDays size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color, size }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
