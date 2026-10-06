import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { FONTS, JOURNAL } from '@/constants/theme';

// Android line-height spans affect the entire line. Keep a small unit label
// outside the number's Text so its line height cannot crop the larger glyphs.
export function MetricValue({
  value,
  unit,
  valueStyle,
  unitStyle,
  style,
}: {
  value: string | number;
  unit: string;
  valueStyle?: StyleProp<TextStyle>;
  unitStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={`${value} ${unit}`}
    >
      <Text style={[styles.value, valueStyle]}>{value}</Text>
      <Text style={[styles.unit, unitStyle]}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 2,
  },
  value: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    lineHeight: 38,
    includeFontPadding: true,
    color: JOURNAL.ink,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  unit: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 20,
    includeFontPadding: true,
    letterSpacing: 0,
    color: JOURNAL.muted,
    flexShrink: 1,
  },
});
