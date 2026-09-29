import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Coffee, Soup, Utensils, Apple, Plus } from 'lucide-react-native';
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
      <View style={styles.header}>
        <Text style={styles.label}>{title.toUpperCase()}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Add ${title.toLowerCase()}`}
          onPress={() => onAddPress(type)}
          style={styles.add}
        >
          <Plus size={18} color={JOURNAL.accent} />
        </TouchableOpacity>
      </View>
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
          <Text style={styles.detail}>Add {title.toLowerCase()}</Text>
          <Plus size={16} color={JOURNAL.accent} />
        </TouchableOpacity>
      )}
    </View>
  );
});
const styles = StyleSheet.create({
  section: {
    borderTopWidth: 1,
    borderTopColor: JOURNAL.line,
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    letterSpacing: 1,
    color: JOURNAL.muted,
    fontWeight: '600',
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
    paddingBottom: 16,
    paddingTop: 4,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: JOURNAL.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: FONTS.sans,
    fontSize: 16,
    color: JOURNAL.ink,
    lineHeight: 23,
    fontWeight: '500',
  },
  detail: { fontSize: 12, color: JOURNAL.muted, lineHeight: 19 },
  energy: { alignItems: 'flex-end' },
  calories: { fontSize: 18, color: JOURNAL.ink, fontVariant: ['tabular-nums'] },
  empty: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
});
