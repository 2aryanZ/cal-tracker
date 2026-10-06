import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Plus from 'lucide-react-native/icons/plus';
import { useNutrition } from '@/context/NutritionContext';
import { MealResultModal } from '@/components/MealResultModal';
import { MealCard } from '@/components/MealCard';
import { ScreenHeader, TempoSheet, tempo } from '@/components/Tempo';
import { MetricValue } from '@/components/MetricValue';
import type { FoodEntry, MealType } from '@/types/nutrition';
import { getTodayDateString } from '@/services/storage';
import { assertDate } from '@/services/nutritionRules';
import { trailingDates, summarizePeriod } from '@/services/analyticsRules';
import {
  localDay,
  shiftDay,
  shiftMonth,
  monthDays,
} from '@/services/calendarRules';
import { JOURNAL as C, FONTS } from '@/constants/theme';
const slots: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
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
  const [weekEnd, setWeekEnd] = useState(selectedDate);
  const [calendar, setCalendar] = useState(false);
  const [month, setMonth] = useState(selectedDate);
  const [dateInput, setDateInput] = useState(selectedDate);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [slot, setSlot] = useState<MealType>('lunch');
  const [mealDate, setMealDate] = useState(selectedDate);
  const week = useMemo(() => trailingDates(weekEnd, 7), [weekEnd]);
  useFocusEffect(
    React.useCallback(() => {
      // Today resets the shared date; keep the visible History strip in step.
      if (selectedDate > weekEnd || selectedDate < shiftDay(weekEnd, -6)) {
        setWeekEnd(selectedDate);
      }
    }, [selectedDate, weekEnd]),
  );
  const summary = useMemo(
    () => summarizePeriod(entries, week, goals),
    [entries, week, goals],
  );
  const loggedDays = useMemo(
    () => new Set(entries.map((e) => e.date)),
    [entries],
  );
  const cells = useMemo(() => monthDays(month), [month]);
  const peak = Math.max(
    goals.calories,
    ...Object.values(summary.totals).map((d) => d.calories),
    1,
  );
  const choose = (date: string) => {
    try {
      assertDate(date);
      setSelectedDate(date);
      setDateInput(date);
      if (!week.includes(date)) setWeekEnd(date);
      setCalendar(false);
    } catch (e) {
      showToast(
        'Invalid date',
        e instanceof Error ? e.message : 'Use YYYY-MM-DD.',
      );
    }
  };
  const openCalendar = () => {
    setMonth(selectedDate);
    setDateInput(selectedDate);
    setCalendar(true);
  };
  const moveWeek = (offset: number) => {
    setWeekEnd(shiftDay(weekEnd, offset));
    setSelectedDate(shiftDay(selectedDate, offset));
  };
  const add = (type: MealType) => {
    setEditing(null);
    setMealDate(selectedDate);
    setSlot(type);
    setVisible(true);
  };
  return (
    <SafeAreaView edges={['top']} style={tempo.page}>
      <ScrollView
        contentContainerStyle={tempo.body}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="History"
          subtitle="Your journal, one day at a time."
          action={
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open month calendar"
              onPress={openCalendar}
              style={tempo.iconButton}
            >
              <CalendarDays size={22} color={C.ink} />
            </TouchableOpacity>
          }
        />
        <View style={tempo.between}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            style={styles.arrow}
            onPress={() => moveWeek(-7)}
          >
            <ChevronLeft size={18} color={C.ink} />
          </TouchableOpacity>
          <Text style={tempo.caption}>
            {localDay(week[0]).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}{' '}
            –{' '}
            {localDay(weekEnd).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Next week"
            style={styles.arrow}
            onPress={() => moveWeek(7)}
          >
            <ChevronRight size={18} color={C.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.week}>
          {week.map((date) => (
            <TouchableOpacity
              key={date}
              accessibilityRole="button"
              accessibilityLabel={`Select ${date}${loggedDays.has(date) ? ', meals recorded' : ', no records'}`}
              accessibilityState={{ selected: date === selectedDate }}
              onPress={() => choose(date)}
              style={[styles.day, date === selectedDate && styles.selectedDay]}
            >
              <Text
                style={[
                  styles.weekday,
                  date === selectedDate && { color: C.onDark },
                ]}
              >
                {localDay(date).toLocaleDateString(undefined, {
                  weekday: 'narrow',
                })}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  date === selectedDate && { color: C.lime },
                ]}
              >
                {localDay(date).getDate()}
              </Text>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: loggedDays.has(date)
                      ? date === selectedDate
                        ? C.lime
                        : C.accent
                      : 'transparent',
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
        <View style={tempo.card}>
          <View style={tempo.between}>
            <View style={{ flex: 1 }}>
              <MetricValue
                value={summary.averageCalories.toLocaleString()}
                unit="kcal"
                valueStyle={styles.average}
                unitStyle={tempo.caption}
              />
              <Text style={tempo.caption}>7-day recorded average</Text>
            </View>
            <Text style={styles.tag}>{summary.loggedDays} / 7 logged</Text>
          </View>
          <View
            style={styles.bars}
            accessible
            accessibilityLabel={week
              .map(
                (d) =>
                  `${d}: ${Math.round(summary.totals[d].calories)} kilocalories recorded`,
              )
              .join('. ')}
          >
            {week.map((date) => (
              <View key={date} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(
                          3,
                          (summary.totals[date].calories / peak) * 96,
                        ),
                        backgroundColor:
                          date === selectedDate ? C.accent : C.soft,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.weekday}>
                  {localDay(date).toLocaleDateString(undefined, {
                    weekday: 'narrow',
                  })}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.fine}>
            Includes {7 - summary.loggedDays} unlogged{' '}
            {7 - summary.loggedDays === 1 ? 'day' : 'days'} as zero records.
          </Text>
        </View>
        <View style={[tempo.between, { marginBottom: 12 }]}>
          <Text accessibilityRole="header" style={tempo.sectionTitle}>
            {localDay(selectedDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}{' '}
            · your meals
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.add}
            onPress={() => add('lunch')}
          >
            <Plus size={16} color={C.accent} />
            <Text style={tempo.text}>Add</Text>
          </TouchableOpacity>
        </View>
        <MetricValue
          value={Math.round(dailySummary.totalCalories).toLocaleString()}
          unit="kcal recorded"
          valueStyle={styles.total}
          unitStyle={tempo.caption}
        />
        <Text style={[tempo.caption, { marginBottom: 12 }]}>
          {dailySummary.entries.length}{' '}
          {dailySummary.entries.length === 1 ? 'entry' : 'entries'} · P{' '}
          {Math.round(dailySummary.totalProtein)} g / C{' '}
          {Math.round(dailySummary.totalCarbs)} g / F{' '}
          {Math.round(dailySummary.totalFats)} g
        </Text>
        {!dailySummary.entries.length && (
          <Text style={[tempo.text, { marginBottom: 16 }]}>
            No meals recorded for this day. Add a meal to start your journal.
          </Text>
        )}
        {slots.map((type) => (
          <MealCard
            key={type}
            type={type}
            title={
              type === 'snack'
                ? 'Snacks'
                : type[0].toUpperCase() + type.slice(1)
            }
            entries={dailySummary.entries.filter((e) => e.mealType === type)}
            onAddPress={add}
            onEditEntry={(entry) => {
              setEditing(entry);
              setVisible(true);
            }}
            onDeleteEntry={(id) => {
              void removeMeal(id).catch((e) =>
                showToast('Delete failed', e.message),
              );
            }}
          />
        ))}
      </ScrollView>
      <TempoSheet
        visible={calendar}
        title="Choose a day"
        onClose={() => setCalendar(false)}
      >
        <View style={[tempo.between, { marginBottom: 12 }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={tempo.iconButton}
            onPress={() => setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft size={20} color={C.ink} />
          </TouchableOpacity>
          <Text style={tempo.sectionTitle}>
            {localDay(month).toLocaleDateString(undefined, {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={tempo.iconButton}
            onPress={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRight size={20} color={C.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.calendarGrid}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <Text key={i} style={styles.calendarLabel}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {cells.map((date, i) =>
            date ? (
              <TouchableOpacity
                key={date}
                accessibilityRole="button"
                accessibilityLabel={`Select ${date}${loggedDays.has(date) ? ', meals recorded' : ''}`}
                accessibilityState={{ selected: date === selectedDate }}
                onPress={() => choose(date)}
                style={[
                  styles.calendarDay,
                  date === selectedDate && styles.selectedDay,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    date === selectedDate && { color: C.lime },
                  ]}
                >
                  {localDay(date).getDate()}
                </Text>
                {loggedDays.has(date) && (
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          date === selectedDate ? C.lime : C.accent,
                      },
                    ]}
                  />
                )}
              </TouchableOpacity>
            ) : (
              <View key={`empty-${i}`} style={styles.calendarDay} />
            ),
          )}
        </View>
        <Text style={[tempo.caption, { marginVertical: 12 }]}>
          A dot marks a day with recorded meals.
        </Text>
        <View style={tempo.between}>
          <TextInput
            accessibilityLabel="History date in YYYY-MM-DD format"
            value={dateInput}
            onChangeText={setDateInput}
            placeholder="YYYY-MM-DD"
            style={styles.input}
          />
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => choose(dateInput)}
            style={tempo.secondary}
          >
            <Text style={tempo.text}>Go</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => choose(getTodayDateString())}
          style={[tempo.primary, { marginTop: 16 }]}
        >
          <Text style={tempo.primaryText}>Go to today</Text>
        </TouchableOpacity>
      </TempoSheet>
      <MealResultModal
        visible={visible}
        editingEntry={editing}
        defaultMealType={slot}
        onClose={() => setVisible(false)}
        onDeleteEntry={removeMeal}
        onConfirm={async (item) => {
          if (editing) await editMeal({ ...editing, ...item, id: editing.id });
          else await logMeal({ ...item, date: mealDate });
        }}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  arrow: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  week: {
    flexDirection: 'row',
    gap: Platform.OS === 'android' ? 1 : 3,
    marginHorizontal: Platform.OS === 'android' ? -8 : 0,
    marginTop: 8,
    marginBottom: 20,
  },
  day: {
    flex: 1,
    minHeight: 84,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  selectedDay: { backgroundColor: C.ink, borderColor: C.ink },
  weekday: { fontFamily: FONTS.sans, fontSize: 10, color: C.muted },
  dayNumber: { fontFamily: FONTS.bold, fontSize: 14, color: C.ink },
  dot: { width: 4, height: 4, borderRadius: 2 },
  average: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    lineHeight: 38,
    color: C.ink,
    letterSpacing: -1,
  },
  tag: {
    fontFamily: FONTS.semibold,
    fontSize: 10,
    color: C.accent,
    backgroundColor: C.soft,
    padding: 8,
    borderRadius: 16,
  },
  bars: { flexDirection: 'row', gap: 10, marginVertical: 20 },
  barColumn: { flex: 1, alignItems: 'center', gap: 8 },
  barTrack: {
    height: 96,
    width: '100%',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  bar: { borderTopLeftRadius: 5, borderTopRightRadius: 5, width: '100%' },
  fine: { ...tempo.caption, fontSize: 10 },
  add: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4 },
  total: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    lineHeight: 38,
    color: C.ink,
    letterSpacing: -1,
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarLabel: {
    width: '14.2857%',
    textAlign: 'center',
    ...tempo.caption,
    paddingVertical: 8,
  },
  calendarDay: {
    width: '14.2857%',
    minHeight: 48,
    paddingVertical: 10,
    gap: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 48,
    padding: 12,
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: C.ink,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
  },
});
