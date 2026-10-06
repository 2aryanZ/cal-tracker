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
function Content({
  visible,
  onClose,
  onSelectAction,
  onSelectMeal,
}: Props) {
  const { recentMeals, favoriteMeals, selectedDate } = useNutrition();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'recent' | 'favorites' | 'all'>(recentMeals.length ? 'recent' : favoriteMeals.length ? 'favorites' : 'recent');
  const [visibleCount, setVisibleCount] = useState(6);
  const [moreMethods, setMoreMethods] = useState(false);
  const choices = useMemo(
    () => savedMealChoices(filter === 'recent' ? [] : favoriteMeals, filter === 'favorites' ? [] : recentMeals),
    [favoriteMeals, recentMeals, filter],
  );
  const searchIndex = useMemo(
    () => choices.map((meal) => ({ meal, name: meal.name.trim().toLowerCase() })),
    [choices],
  );
  const favoriteIds = useMemo(
    () => new Set(favoriteMeals.map((meal) => meal.id)),
    [favoriteMeals],
  );
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? searchIndex.filter(({ name }) => name.includes(term)).map(({ meal }) => meal)
      : choices;
  }, [searchIndex, choices, query]);
  const close = () => {
    setQuery('');
    setVisibleCount(6);
    setMoreMethods(false);
    onClose();
  };
  return (
    <TempoSheet
      visible={visible}
      title="Log a meal"
      onClose={close}
    >
      <Text style={styles.caption}>
        Logging for {selectedDate}. Choose a familiar meal or add something new.
      </Text>
      <Text accessibilityRole="header" style={styles.section}>Recent meals & favorites</Text>
      <View style={styles.filters}>
        {(['recent', 'favorites', 'all'] as const).map((value) => (
          <TouchableOpacity key={value} accessibilityRole="button"
            accessibilityState={{ selected: filter === value }}
            style={[styles.filter, filter === value && styles.activeFilter]}
            onPress={() => { setFilter(value); setVisibleCount(6); }}>
            <Text style={styles.name}>{value === 'recent' ? 'Recent' : value === 'favorites' ? 'Favorites' : 'All'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.search}>
        <Search size={18} color={JOURNAL.muted} />
        <TextInput
          accessibilityLabel={`Search ${filter === 'all' ? 'recent meals and favorites' : filter + ' meals'}`}
          placeholder="Search your meals"
          placeholderTextColor={JOURNAL.muted}
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setVisibleCount(6);
          }}
          style={styles.input}
        />
      </View>
      {onSelectMeal && matches.length ? (
        matches.slice(0, visibleCount).map((meal) => (
          <TouchableOpacity
            key={meal.id}
            accessibilityRole="button"
            style={styles.meal}
            onPress={() => {
              close();
              onSelectMeal(meal);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{meal.name}</Text>
              <Text style={styles.caption}>
                {favoriteIds.has(meal.id) ? 'Favorite' : 'Recent'} · {meal.portionSize || '1 serving'}
              </Text>
              <Text style={styles.caption}>
                Review before saving
              </Text>
            </View>
            <Text style={styles.name}>{meal.calories} kcal</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.caption}>
          {query
            ? 'No matching saved meals.'
            : filter === 'favorites' ? 'Save a favorite from a meal’s review to find it here.' : 'Your logged meals will appear here. Add your first meal below.'}
        </Text>
      )}
      {matches.length > visibleCount && (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.method}
          onPress={() => setVisibleCount((count) => count + 20)}
        >
          <Text style={styles.name}>
            Show more saved meals ({matches.length - visibleCount})
          </Text>
        </TouchableOpacity>
      )}
      <Text style={styles.section}>Something new</Text>
      {(moreMethods ? methods : methods.slice(0, 2)).map(({ id, label, detail, Icon }) => (
        <TouchableOpacity
          accessibilityRole="button"
          key={id}
          style={styles.method}
          onPress={() => {
            close();
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
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: moreMethods }}
        style={styles.method}
        onPress={() => setMoreMethods((value) => !value)}
      >
        <Text style={styles.name}>{moreMethods ? 'Fewer options' : 'More ways to log'}</Text>
      </TouchableOpacity>
    </TempoSheet>
  );
}
export function QuickActionHubModal(props: Props) {
  // Mount only while open: no saved-meal filtering on unrelated journal updates.
  return props.visible ? <Content {...props} /> : null;
}
const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filter: { minHeight: 48, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: JOURNAL.line, backgroundColor: JOURNAL.surface, justifyContent: 'center' },
  activeFilter: { backgroundColor: JOURNAL.soft, borderColor: JOURNAL.accent },
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
    marginBottom: 8,
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
