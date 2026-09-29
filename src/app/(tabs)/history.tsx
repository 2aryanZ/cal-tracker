import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNutrition } from '@/context/NutritionContext';
import { MealResultModal } from '@/components/MealResultModal';
import { MealCard } from '@/components/MealCard';
import type { FoodEntry, MealType } from '@/types/nutrition';
import { getTodayDateString, toLocalDateString } from '@/services/storage';
import { assertDate } from '@/services/nutritionRules';
import { trailingDates, summarizePeriod } from '@/services/analyticsRules';
import { PALETTE, FONTS } from '@/constants/theme';
export default function HistoryScreen() {
  const {
    entries,
    selectedDate,
    setSelectedDate,
    goals,
    dailySummary,
    editMeal,
    logMeal,
    removeMeal,
    showToast,
  } = useNutrition();
  const [dateDraft, setDateDraft] = useState<{
      date: string;
      value: string;
    } | null>(null),
    [visible, setVisible] = useState(false),
    [editing, setEditing] = useState<FoodEntry | null>(null),
    [slot, setSlot] = useState<MealType>('lunch'),
    [mealDate, setMealDate] = useState(selectedDate);
  const dateInput =
    dateDraft?.date === selectedDate ? dateDraft.value : selectedDate;
  const summary = useMemo(
    () => summarizePeriod(entries, trailingDates(selectedDate, 7), goals),
    [entries, selectedDate, goals],
  );
  const choose = (date: string) => {
    try {
      assertDate(date);
      setSelectedDate(date);
      setDateDraft(null);
    } catch (e) {
      showToast(
        'Invalid date',
        e instanceof Error ? e.message : 'Use YYYY-MM-DD.',
      );
    }
  };
  const move = (offset: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    choose(toLocalDateString(new Date(y, m - 1, d + offset)));
  };
  const add = (type: MealType) => {
    setEditing(null);
    setMealDate(selectedDate);
    setSlot(type);
    setVisible(true);
  };
  return (
    <SafeAreaView edges={['top']} style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Meal history</Text>
        <View style={styles.row}>
          <TouchableOpacity
            accessibilityLabel="Previous day"
            accessibilityRole="button"
            style={styles.button}
            onPress={() => move(-1)}
          >
            <Text>‹ Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.button}
            onPress={() => choose(getTodayDateString())}
          >
            <Text>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Next day"
            accessibilityRole="button"
            style={styles.button}
            onPress={() => move(1)}
          >
            <Text>Next ›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TextInput
            accessibilityLabel="History date in YYYY-MM-DD format"
            value={dateInput}
            onChangeText={(value) =>
              setDateDraft({ date: selectedDate, value })
            }
            style={styles.input}
            placeholder="YYYY-MM-DD"
          />
          <TouchableOpacity
            style={styles.button}
            accessibilityRole="button"
            onPress={() => choose(dateInput)}
          >
            <Text>Go</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.date}>{selectedDate}</Text>
        <View style={styles.card}>
          <Text style={styles.total}>
            {dailySummary.totalCalories} kcal logged
          </Text>
          <Text style={styles.text}>
            P {dailySummary.totalProtein}g · C {dailySummary.totalCarbs}g · F{' '}
            {dailySummary.totalFats}g
          </Text>
          <Text style={styles.text}>
            {dailySummary.entries.length} meals ·{' '}
            {!dailySummary.entries.length
              ? 'No records yet'
              : dailySummary.goalMet
                ? 'Within calorie target'
                : 'Outside calorie target'}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.subtitle}>Seven days ending {selectedDate}</Text>
          <Text style={styles.text}>
            {summary.averageCalories} kcal per day, including days with no logs
          </Text>
          <Text style={styles.text}>
            {summary.loggedDays}/7 days logged · {summary.goalDays}/7 days
            within target
          </Text>
        </View>
        {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(
          (type) => (
            <MealCard
              key={type}
              type={type}
              title={type[0].toUpperCase() + type.slice(1)}
              entries={dailySummary.entries.filter((e) => e.mealType === type)}
              onAddPress={add}
              onEditEntry={(e) => {
                setEditing(e);
                setVisible(true);
              }}
              onDeleteEntry={(id) => {
                void removeMeal(id).catch((e) =>
                  showToast('Delete failed', e.message),
                );
              }}
            />
          ),
        )}
        {!dailySummary.entries.length && (
          <Text style={styles.text}>No meals logged for this day.</Text>
        )}
      </ScrollView>
      <MealResultModal
        visible={visible}
        editingEntry={editing}
        defaultMealType={slot}
        onClose={() => setVisible(false)}
        onDeleteEntry={removeMeal}
        onConfirm={async (item) => {
          if (editing) await editMeal({ ...editing, ...item, id: editing.id });
          else
            await logMeal({
              ...item,
              date: mealDate,
            });
        }}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PALETTE[50] },
  body: { padding: 24, paddingBottom: 32 },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 30,
    color: PALETTE[950],
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  button: {
    minHeight: 48,
    minWidth: 48,
    padding: 12,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: PALETTE[100],
  },
  input: {
    flex: 1,
    minHeight: 48,
    padding: 12,
    fontSize: 16,
    backgroundColor: PALETTE.white,
    borderRadius: 12,
  },
  date: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 20,
    color: PALETTE[950],
  },
  card: {
    backgroundColor: PALETTE.white,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE[200],
    marginBottom: 16,
  },
  total: { fontSize: 26, fontWeight: '600', color: PALETTE[950] },
  subtitle: { fontSize: 16, fontWeight: '600', color: PALETTE[950] },
  text: { fontSize: 15, lineHeight: 23, color: PALETTE[600], marginTop: 8 },
});
