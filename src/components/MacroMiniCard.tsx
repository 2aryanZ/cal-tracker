import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Drumstick, Wheat, Droplet } from 'lucide-react-native';
import { PALETTE, FONTS } from '@/constants/theme';

interface MacroMiniCardProps {
  label: string;
  consumed: number;
  target: number;
  type: 'protein' | 'carbs' | 'fats';
}

const CONFIG = {
  protein: {
    color: PALETTE[700],  // #2D5758
    track: PALETTE[100],  // #DAEDEB
    icon: Drumstick,
    sub: 'Protein eaten',
  },
  carbs: {
    color: PALETTE[500],  // #448888
    track: PALETTE[100],  // #DAEDEB
    icon: Wheat,
    sub: 'Carbs eaten',
  },
  fats: {
    color: PALETTE[400],  // #5EA3A2
    track: PALETTE[100],  // #DAEDEB
    icon: Droplet,
    sub: 'Fat eaten',
  },
};

export const MacroMiniCard = React.memo(function MacroMiniCard({
  label,
  consumed,
  target,
  type,
}: MacroMiniCardProps) {
  const cfg = CONFIG[type] || CONFIG.protein;
  const Icon = cfg.icon;

  const size = 44;
  const strokeWidth = 3.5;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(consumed / (target || 1), 0), 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={styles.card}>
      <View style={styles.topText}>
        <Text style={styles.amount}>
          {consumed}
          <Text style={styles.target}>/{target}g</Text>
        </Text>
        <Text style={styles.sublabel}>{cfg.sub}</Text>
      </View>

      <View style={styles.ringContainer}>
        <Svg width={size} height={size} style={styles.svg}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={cfg.track}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={cfg.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
        <View style={styles.iconCenter}>
          <Icon size={15} color={cfg.color} strokeWidth={2} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 112,
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  topText: {
    alignItems: 'center',
    marginBottom: 6,
  },
  amount: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE[950],
    letterSpacing: -0.3,
  },
  target: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '500',
    color: PALETTE[400],
  },
  sublabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '500',
    color: PALETTE[600],
    marginTop: 2,
    letterSpacing: 0.2,
  },
  ringContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  iconCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
