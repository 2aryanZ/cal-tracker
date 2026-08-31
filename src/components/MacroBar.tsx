import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MacroBarProps {
  label: string;
  consumed: number;
  target: number;
  color: string;
  unit?: string;
}

export function MacroBar({
  label,
  consumed,
  target,
  color,
  unit = 'g',
}: MacroBarProps) {
  const percentage = Math.min(Math.round((consumed / (target || 1)) * 100), 100);
  const left = Math.max(0, target - consumed);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.labelGroup}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.leftLabel}>
          {left}
          {unit} left
        </Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: `${percentage}%`,
            },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.amount}>
          {consumed}
          <Text style={styles.target}> / {target}{unit}</Text>
        </Text>
        <Text style={[styles.percent, { color }]}>{percentage}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  leftLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  track: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  target: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748B',
  },
  percent: {
    fontSize: 11,
    fontWeight: '700',
  },
});
