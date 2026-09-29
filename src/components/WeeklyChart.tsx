import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FoodEntry } from '@/types/nutrition';
import { toLocalDateString } from '@/services/storage';
import { PALETTE, FONTS } from '@/constants/theme';

interface WeeklyChartProps {
  entries: FoodEntry[];
  targetCalories: number;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const WeeklyChart = React.memo(function WeeklyChart({
  entries,
  targetCalories,
  selectedDate,
  onSelectDate,
}: WeeklyChartProps) {
  // Pre-index entries by date for O(1) lookups
  const entriesByDate = React.useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      map.set(e.date, (map.get(e.date) || 0) + (Number(e.calories) || 0));
    }
    return map;
  }, [entries]);

  // Generate last 7 days including today
  const days = React.useMemo(() => {
    const list = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = toLocalDateString(d);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' });
      const dayNum = d.getDate();

      const totalCal = entriesByDate.get(dateStr) || 0;

      list.push({
        dateStr,
        dayLabel,
        dayNum,
        totalCal,
        isToday: i === 0,
      });
    }

    return list;
  }, [entriesByDate]);

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

          let barColor = PALETTE[700];
          if (isOver) barColor = '#F59E0B';
          else if (isTargetMet) barColor = '#10B981';
          else if (day.totalCal === 0) barColor = PALETTE[200];

          return (
            <TouchableOpacity accessibilityRole="button"
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
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: PALETTE.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE[100],
    marginBottom: 16,
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[950],
  },
  goalPill: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[700],
    backgroundColor: PALETTE[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE[100],
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
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE[400],
    marginBottom: 6,
  },
  barValueSelected: {
    color: PALETTE[950],
    fontWeight: '800',
  },
  barTrack: {
    width: 24,
    height: 90,
    backgroundColor: PALETTE[50],
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  barTrackSelected: {
    borderWidth: 1.5,
    borderColor: PALETTE[950],
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
    backgroundColor: PALETTE[100],
  },
  dayLabelText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE[600],
  },
  dayLabelTextActive: {
    color: PALETTE[950],
    fontWeight: '800',
  },
  dayLabelTextToday: {
    color: '#059669',
    fontWeight: '800',
  },
  dayNumText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE[400],
  },
  dayNumTextActive: {
    color: PALETTE[950],
    fontWeight: '700',
  },
});
