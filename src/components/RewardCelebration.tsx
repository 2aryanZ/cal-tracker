import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Flame, Sparkles, Trophy, Zap, CheckCircle2 } from 'lucide-react-native';

interface RewardCelebrationProps {
  visible: boolean;
  streak: number;
  title: string;
  subtitle: string;
  caloriesAdded: number;
  onDismiss: () => void;
}

export function RewardCelebration({
  visible,
  streak,
  title,
  subtitle,
  caloriesAdded,
  onDismiss,
}: RewardCelebrationProps) {
  const scaleAnim = React.useRef(new Animated.Value(0.7)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        onDismiss();
      }, 3500);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}>
          {/* Top floating icon */}
          <View style={styles.trophyGlow}>
            <View style={styles.trophyInner}>
              <Flame size={36} color="#F59E0B" />
            </View>
          </View>

          {/* Streak Counter Badge */}
          <View style={styles.streakPill}>
            <Zap size={14} color="#F59E0B" />
            <Text style={styles.streakPillText}>{streak} DAY STREAK!</Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {caloriesAdded > 0 && (
            <View style={styles.statsCard}>
              <CheckCircle2 size={18} color="#10B981" />
              <Text style={styles.statsText}>
                <Text style={styles.statsHighlight}>+{caloriesAdded} kcal</Text> counted toward today's goal
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={onDismiss} activeOpacity={0.85}>
            <Sparkles size={16} color="#0F172A" />
            <Text style={styles.buttonText}>Keep Crushing It!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  trophyGlow: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  trophyInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#78350F',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  streakPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FCD34D',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statsText: {
    fontSize: 12,
    color: '#E2E8F0',
    flexShrink: 1,
  },
  statsHighlight: {
    fontWeight: '700',
    color: '#10B981',
  },
  button: {
    backgroundColor: '#38BDF8',
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
});
