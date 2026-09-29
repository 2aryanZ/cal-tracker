import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  Barcode,
  PencilLine,
  MessageSquareText,
  ChefHat,
  Scale,
  X,
  Search,
} from 'lucide-react-native';
import { JOURNAL, FONTS } from '@/constants/theme';
import { useNutrition } from '@/context/NutritionContext';
import type { FoodEntry, FavoriteMeal } from '@/types/nutrition';
type Action =
  | 'scan_food'
  | 'barcode'
  | 'voice_log'
  | 'meal_plan'
  | 'log_weight'
  | 'quick_meal';
interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: Action) => void;
  onSelectMeal?: (meal: FoodEntry | FavoriteMeal) => void;
}
const methods = [
  {
    id: 'quick_meal',
    label: 'Enter manually',
    detail: 'Use a label or your own values',
    Icon: PencilLine,
  },
  {
    id: 'scan_food',
    label: 'Take a food photo',
    detail: 'Review a nutrition estimate',
    Icon: Camera,
  },
  {
    id: 'barcode',
    label: 'Scan a barcode',
    detail: 'Look up packaged food',
    Icon: Barcode,
  },
  {
    id: 'voice_log',
    label: 'Describe a meal',
    detail: 'Type a description for an estimate',
    Icon: MessageSquareText,
  },
  {
    id: 'meal_plan',
    label: 'Meal ideas',
    detail: 'Ideas based on your preferences',
    Icon: ChefHat,
  },
  {
    id: 'log_weight',
    label: 'Log weight',
    detail: 'Record a weigh-in',
    Icon: Scale,
  },
] as const;
export function QuickActionHubModal({
  visible,
  onClose,
  onSelectAction,
  onSelectMeal,
}: Props) {
  const { recentMeals, favoriteMeals, selectedDate } = useNutrition();
  const [query, setQuery] = useState('');
  const matches = [
    ...new Map(
      [...favoriteMeals, ...recentMeals].map((m) => [
        m.name.trim().toLowerCase(),
        m,
      ]),
    ).values(),
  ].filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Modal visible={visible} animationType="none" onRequestClose={onClose}>
      <SafeAreaView style={styles.page}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.body}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Add food</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close add food"
              onPress={onClose}
              style={styles.close}
            >
              <X size={22} color={JOURNAL.ink} />
            </TouchableOpacity>
          </View>
          <Text style={styles.caption}>
            Logging for {selectedDate}. Choose a familiar meal or add something
            new.
          </Text>
          <View style={styles.search}>
            <Search size={18} color={JOURNAL.muted} />
            <TextInput
              accessibilityLabel="Search recent meals and favorites"
              placeholder="Search your meals"
              placeholderTextColor={JOURNAL.muted}
              value={query}
              onChangeText={setQuery}
              style={styles.input}
            />
          </View>
          <Text style={styles.section}>Recent meals & favorites</Text>
          {onSelectMeal && matches.length ? (
            matches.map((meal) => (
              <TouchableOpacity
                key={meal.id}
                accessibilityRole="button"
                style={styles.meal}
                onPress={() => {
                  onClose();
                  setQuery('');
                  onSelectMeal(meal);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{meal.name}</Text>
                  <Text style={styles.caption}>
                    {meal.portionSize || '1 serving'} · Review before saving
                  </Text>
                </View>
                <Text style={styles.name}>{meal.calories} kcal</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.caption}>
              {query
                ? 'No matching saved meals.'
                : 'Your logged meals and favorites will appear here.'}
            </Text>
          )}
          <Text style={styles.section}>Something new</Text>
          {methods.map(({ id, label, detail, Icon }) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={id}
              style={styles.method}
              onPress={() => {
                onClose();
                setQuery('');
                onSelectAction(id);
              }}
            >
              <View style={styles.icon}>
                <Icon size={21} color={JOURNAL.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{label}</Text>
                <Text style={styles.caption}>{detail}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: JOURNAL.paper },
  body: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontFamily: FONTS.serif, fontSize: 30, color: JOURNAL.ink },
  close: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { fontSize: 14, lineHeight: 22, color: JOURNAL.muted },
  section: {
    fontSize: 17,
    color: JOURNAL.ink,
    fontWeight: '600',
    marginTop: 28,
    marginBottom: 12,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: JOURNAL.surface,
    borderWidth: 1,
    borderColor: JOURNAL.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 20,
  },
  input: { flex: 1, minHeight: 48, fontSize: 16, color: JOURNAL.ink },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: JOURNAL.line,
  },
  name: { fontSize: 16, color: JOURNAL.ink, lineHeight: 23 },
  method: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: JOURNAL.line,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: JOURNAL.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
