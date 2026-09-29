import React from 'react';
import { useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import {
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  UserRound,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JOURNAL, FONTS } from '@/constants/theme';
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: JOURNAL.accent,
        tabBarInactiveTintColor: JOURNAL.muted,
        tabBarAllowFontScaling: true,
        tabBarStyle: {
          backgroundColor: JOURNAL.surface,
          borderTopColor: JOURNAL.line,
          height: 76 + Math.max(0, fontScale - 1) * 16 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(6, insets.bottom),
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.sans,
          fontSize: 12,
          lineHeight: 16,
          marginTop: 2,
          flexShrink: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <BookOpen size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <CalendarDays size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => (
            <ChartNoAxesCombined size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <UserRound size={21} color={color} />,
        }}
      />
      <Tabs.Screen name="scan" options={{ href: null }} />
    </Tabs>
  );
}
