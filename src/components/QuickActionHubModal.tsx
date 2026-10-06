import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { TempoSheet } from '@/components/Tempo';
import Camera from 'lucide-react-native/icons/camera';
import Barcode from 'lucide-react-native/icons/barcode';
import PencilLine from 'lucide-react-native/icons/pencil-line';
import MessageSquareText from 'lucide-react-native/icons/message-square-text';
import ChefHat from 'lucide-react-native/icons/chef-hat';
import Scale from 'lucide-react-native/icons/scale';
import Search from 'lucide-react-native/icons/search';
import { JOURNAL, FONTS } from '@/constants/theme';
import { savedMealChoices } from '@/services/journalRules';
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
  const [visibleCount, setVisibleCount] = useState(40);
  const choices = useMemo(
    () => savedMealChoices(favoriteMeals, recentMeals),
    [favoriteMeals, recentMeals],
  );
  const matches = useMemo(
    () =>
      choices.filter((m) =>
        m.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [choices, query],
  );
  return (
    <TempoSheet
      visible={visible}
      title="Log a meal"
      onClose={() => {
        setQuery('');
        setVisibleCount(40);
        onClose();
      }}
    >
      <Text style={styles.caption}>
        Logging for {selectedDate}. Choose a familiar meal or add something new.
      </Text>
      <Text style={styles.section}>Something new</Text>
      {methods.map(({ id, label, detail, Icon }) => (
        <TouchableOpacity
          accessibilityRole="button"
          key={id}
          style={styles.method}
          onPress={() => {
            onClose();
            setQuery('');
            setVisibleCount(40);
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
      <View style={styles.search}>
        <Search size={18} color={JOURNAL.muted} />
        <TextInput
          accessibilityLabel="Search recent meals and favorites"
          placeholder="Search your meals"
          placeholderTextColor={JOURNAL.muted}
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setVisibleCount(40);
          }}
          style={styles.input}
        />
      </View>
      <Text style={styles.section}>Recent meals & favorites</Text>
      {onSelectMeal && matches.length ? (
        matches.slice(0, visibleCount).map((meal) => (
          <TouchableOpacity
            key={meal.id}
            accessibilityRole="button"
            style={styles.meal}
            onPress={() => {
              onClose();
              setQuery('');
              setVisibleCount(40);
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
      {matches.length > visibleCount && (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.method}
          onPress={() => setVisibleCount((count) => count + 40)}
        >
          <Text style={styles.name}>
            Show more saved meals ({matches.length - visibleCount})
          </Text>
        </TouchableOpacity>
      )}
    </TempoSheet>
  );
}
const styles = StyleSheet.create({
  caption: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 22,
    color: JOURNAL.muted,
  },
  section: {
    fontFamily: FONTS.sans,
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
  input: {
    fontFamily: FONTS.sans,
    flex: 1,
    minHeight: 48,
    fontSize: 16,
    color: JOURNAL.ink,
  },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: JOURNAL.line,
  },
  name: {
    fontFamily: FONTS.sans,
    fontSize: 16,
    color: JOURNAL.ink,
    lineHeight: 23,
  },
  method: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: JOURNAL.line,
    backgroundColor: JOURNAL.surface,
    borderRadius: 16,
    marginBottom: 8,
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
