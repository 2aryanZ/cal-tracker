import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Flame } from 'lucide-react-native';
import { PALETTE } from '@/constants/theme';

interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

export function CalorieRing({
  consumed,
  goal,
  size = 80,
  strokeWidth = 6.5,
}: CalorieRingProps) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = Math.min(Math.max(consumed / (goal || 1), 0), 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background Track in soft 100 tint */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={PALETTE[100]}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress Arc in deep luxury teal-black */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={PALETTE[950]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Center Monochrome Flame Icon */}
      <View style={styles.innerContent}>
        <Flame size={19} color={PALETTE[950]} fill={PALETTE[950]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
