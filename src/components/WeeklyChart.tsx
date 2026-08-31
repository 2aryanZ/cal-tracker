import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FoodEntry } from '@/types/nutrition';

interface WeeklyChartProps {
  entries: FoodEntry[];
  targetCalories: number;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function WeeklyChart({
  entries,
  targetCalories,
  selectedDate,
  onSelectDate,
}: WeeklyChartProps) {
  // Generate last 7 days including today
  const days = React.useMemo(() => {
    const list = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' });
      const dayNum = d.getDate();

      const dayEntries = entries.filter((e) => e.date === dateStr);
      const totalCal = dayEntries.reduce((sum, e) => sum + (Number(e.calories) || 0), 0);

      list.push({
        dateStr,
        dayLabel,
        dayNum,
        totalCal,
        isToday: i === 0,
      });
    }

    return list;
  }, [entries]);

  const maxCal = Math.max(...days.map((d) => d.totalCal), targetCalories, 2400);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Calorie Adherence</Text>
        <Text style={styles.goalPill}>Target: {targetCalories} kcal</Text>
      </View>

      <View style={styles.chartArea}>
        {days.map((day) => {
          const heightPercent = Math.min(Math.round((day.totalCal / maxCal) * 100), 100);
          const isSelected = selectedDate === day.dateStr;
          const isOver = day.totalCal > targetCalories;
          const isTargetMet = day.totalCal >= targetCalories * 0.85 && !isOver;

          let barColor = '#38BDF8';
          if (isOver) barColor = '#F59E0B';
          else if (isTargetMet) barColor = '#10B981';
          else if (day.totalCal === 0) barColor = '#334155';

          return (
            <TouchableOpacity
              key={day.dateStr}
              style={styles.barColumn}
              onPress={() => onSelectDate(day.dateStr)}
              activeOpacity={0.7}>
              {/* Value on top */}
              <Text style={[styles.barValue, isSelected && styles.barValueSelected]}>
                {day.totalCal > 0 ? `${Math.round(day.totalCal / 100) / 10}k` : '0'}
              </Text>

              {/* Bar Track & Fill */}
              <View style={[styles.barTrack, isSelected && styles.barTrackSelected]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(heightPercent, 6)}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>

              {/* Day Label */}
              <View style={[styles.dayLabelPill, isSelected && styles.dayLabelPillActive]}>
                <Text
                  style={[
                    styles.dayLabelText,
                    isSelected && styles.dayLabelTextActive,
                    day.isToday && styles.dayLabelTextToday,
                  ]}>
                  {day.dayLabel}
                </Text>
                <Text
                  style={[
                    styles.dayNumText,
                    isSelected && styles.dayNumTextActive,
                  ]}>
                  {day.dayNum}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  goalPill: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    backgroundColor: '#090D16',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  barValueSelected: {
    color: '#38BDF8',
    fontWeight: '900',
  },
  barTrack: {
    width: 24,
    height: 90,
    backgroundColor: '#090D16',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  barTrackSelected: {
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  dayLabelPill: {
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  dayLabelPillActive: {
    backgroundColor: '#0C4A6E',
  },
  dayLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dayLabelTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  dayLabelTextToday: {
    color: '#10B981',
  },
  dayNumText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#64748B',
  },
  dayNumTextActive: {
    color: '#E2E8F0',
    fontWeight: '700',
  },
});
