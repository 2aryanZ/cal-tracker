import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Coffee from 'lucide-react-native/icons/coffee';
import Soup from 'lucide-react-native/icons/soup';
import Utensils from 'lucide-react-native/icons/utensils';
import Apple from 'lucide-react-native/icons/apple';
import Plus from 'lucide-react-native/icons/plus';
import type { FoodEntry, MealType } from '@/types/nutrition';
import { JOURNAL, FONTS } from '@/constants/theme';
interface MealCardProps {
  type: MealType;
  title: string;
  entries: FoodEntry[];
  onAddPress: (type: MealType) => void;
  onEditEntry?: (entry: FoodEntry) => void;
  onDeleteEntry: (id: string) => void;
}
const icons = {
  breakfast: Coffee,
  lunch: Soup,
  dinner: Utensils,
  snack: Apple,
};
export const MealCard = React.memo(function MealCard({
  type,
  title,
  entries,
  onAddPress,
  onEditEntry,
}: MealCardProps) {
  const Icon = icons[type];
  return (
    <View style={styles.section}>
      {entries.length ? (
        entries.map((item) => (
          <TouchableOpacity
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}, ${item.calories} kilocalories`}
            onPress={() => onEditEntry?.(item)}
            style={styles.meal}
            activeOpacity={0.7}
          >
            {item.imageUri ? (
              <Image
                source={{ uri: item.imageUri }}
                style={styles.image}
                cachePolicy="memory-disk"
                accessibilityLabel={item.name}
              />
            ) : (
              <View style={styles.image}>
                <Icon size={22} color={JOURNAL.accent} />
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.label}>
                {title.toUpperCase()} ·{' '}
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.detail}>
                {item.portionSize || '1 serving'} ·{' '}
                {item.source === 'barcode'
                  ? 'Barcode'
                  : item.source === 'label'
                    ? 'Label values'
                    : item.isAiGenerated
                      ? 'Estimate'
                      : 'Manual entry'}
              </Text>
            </View>
            <View style={styles.energy}>
              <Text style={styles.calories}>{Math.round(item.calories)}</Text>
              <Text style={styles.detail}>kcal</Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => onAddPress(type)}
          style={styles.empty}
        >
          <View>
            <Text style={styles.name}>{title}</Text>
            <Text style={styles.detail}>No meals recorded · add a meal</Text>
          </View>
          <View style={styles.add}>
            <Plus size={18} color={JOURNAL.accent} />
          </View>
        </TouchableOpacity>
      )}
      {entries.length > 0 && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Add ${title.toLowerCase()}`}
          onPress={() => onAddPress(type)}
          style={styles.more}
        >
          <Plus size={14} color={JOURNAL.accent} />
          <Text style={styles.detail}>Add {title.toLowerCase()}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});
const styles = StyleSheet.create({
  section: { borderBottomWidth: 1, borderBottomColor: JOURNAL.line },
  label: {
    fontFamily: FONTS.semibold,
    fontSize: 10,
    letterSpacing: 0.4,
    color: JOURNAL.muted,
    marginBottom: 4,
  },
  add: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meal: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  image: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: JOURNAL.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: JOURNAL.ink,
    lineHeight: 20,
  },
  detail: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: JOURNAL.muted,
    lineHeight: 17,
  },
  energy: { alignItems: 'flex-end' },
  calories: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: JOURNAL.ink,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    minHeight: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  more: {
    minHeight: 48,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
});
