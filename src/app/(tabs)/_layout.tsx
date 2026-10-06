import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Tabs } from 'expo-router';
import BookOpen from 'lucide-react-native/icons/book-open';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import ChartNoAxesCombined from 'lucide-react-native/icons/chart-no-axes-combined';
import UserRound from 'lucide-react-native/icons/user-round';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JOURNAL as C, FONTS } from '@/constants/theme';
const icons = {
  index: BookOpen,
  history: CalendarDays,
  analytics: ChartNoAxesCombined,
  profile: UserRound,
};
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, descriptors, navigation }) => (
        <View
          style={[styles.bar, { paddingBottom: Math.max(8, insets.bottom) }]}
        >
          {state.routes
            .filter((route) => route.name in icons)
            .map((route) => {
              const selected = state.routes[state.index].key === route.key;
              const title = descriptors[route.key].options.title ?? route.name;
              const Icon = icons[route.name as keyof typeof icons];
              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${title} tab`}
                  accessibilityState={{ selected }}
                  style={[
                    styles.tab,
                    selected && styles.active,
                    { minHeight: 52 + Math.max(0, fontScale - 1) * 24 },
                  ]}
                  onPress={() => {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!selected && !event.defaultPrevented)
                      navigation.navigate(route.name, route.params);
                  }}
                  onLongPress={() =>
                    navigation.emit({ type: 'tabLongPress', target: route.key })
                  }
                >
                  <Icon size={21} color={selected ? C.accentText : C.muted} />
                  <Text
                    style={[styles.label, selected && styles.selectedLabel]}
                  >
                    {title}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </View>
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="scan" options={{ href: null }} />
    </Tabs>
  );
}
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    paddingVertical: 6,
  },
  active: { backgroundColor: C.selected },
  label: { fontFamily: FONTS.sans, fontSize: 11, color: C.muted },
  selectedLabel: { fontFamily: FONTS.semibold, color: C.accentText },
});
