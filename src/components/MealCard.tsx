import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Trash2, Plus, Flame, Drumstick, Wheat, Droplet } from 'lucide-react-native';
import { FoodEntry, MealType } from '@/types/nutrition';
import { PALETTE, FONTS } from '@/constants/theme';
import { triggerLightImpact } from '@/services/hapticsService';

interface MealCardProps {
  type: MealType;
  title: string;
  entries: FoodEntry[];
  onAddPress: (type: MealType) => void;
  onEditEntry?: (entry: FoodEntry) => void;
  onDeleteEntry: (id: string) => void;
}

const DEFAULT_FOOD_IMAGES: Record<MealType, string> = {
  breakfast: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300&auto=format&fit=crop&q=80',
  lunch: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&auto=format&fit=crop&q=80',
  dinner: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300&auto=format&fit=crop&q=80',
  snack: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=300&auto=format&fit=crop&q=80',
};

export const MealCard = React.memo(function MealCard({
  type,
  title,
  entries,
  onAddPress,
  onEditEntry,
  onDeleteEntry,
}: MealCardProps) {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            triggerLightImpact();
            onAddPress(type);
          }}
          activeOpacity={0.7}>
          <Plus size={15} color={PALETTE[950]} />
        </TouchableOpacity>
      </View>

      {/* Entries */}
      {entries.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyCard}
          onPress={() => {
            triggerLightImpact();
            onAddPress(type);
          }}
          activeOpacity={0.7}>
          <Text style={styles.emptyText}>No food logged • Tap + to add</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.list}>
          {entries.map((item) => {
            const displayTime = item.timestamp
              ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()
              : '12:37pm';

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => {
                  triggerLightImpact();
                  if (onEditEntry) onEditEntry(item);
                }}
                activeOpacity={0.8}>
                <Image
                  source={{ uri: item.imageUri || DEFAULT_FOOD_IMAGES[type] }}
                  style={styles.foodImage}
                  cachePolicy="memory-disk"
                  transition={150}
                />

                <View style={styles.itemInfo}>
                  <View style={styles.itemTopRow}>
                    <Text style={styles.foodName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.timeText}>{displayTime}</Text>
                  </View>

                  <View style={styles.calRow}>
                    <Flame size={13} color={PALETTE[700]} fill={PALETTE[700]} />
                    <Text style={styles.calText}>{item.calories} Calories</Text>
                  </View>

                  {/* Monochrome Macro Indicators */}
                  <View style={styles.macroPillsRow}>
                    <View style={styles.macroPill}>
                      <Drumstick size={11} color={PALETTE[600]} />
                      <Text style={styles.macroPillText}>{item.protein}g</Text>
                    </View>
                    <View style={styles.macroPill}>
                      <Wheat size={11} color={PALETTE[500]} />
                      <Text style={styles.macroPillText}>{item.carbs}g</Text>
                    </View>
                    <View style={styles.macroPill}>
                      <Droplet size={11} color={PALETTE[400]} />
                      <Text style={styles.macroPillText}>{item.fats}g</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    triggerLightImpact();
                    onDeleteEntry(item.id);
                  }}
                  style={styles.deleteBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Trash2 size={13} color={PALETTE[400]} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
});


const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE[950],
    letterSpacing: -0.2,
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PALETTE[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PALETTE[200],
    borderStyle: 'dashed',
  },
  emptyText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE[400],
  },
  list: {
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 12,
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: PALETTE[100],
    gap: 12,
  },
  foodImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: PALETTE[100],
  },
  itemInfo: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  foodName: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[950],
    flex: 1,
  },
  timeText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[400],
    fontWeight: '500',
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
  calText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[800],
  },
  macroPillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroPillText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE[600],
  },
  deleteBtn: {
    padding: 4,
  },
});
