import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Flame, Sparkles, Zap, CheckCircle2 } from 'lucide-react-native';

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
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

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
  }, [visible, onDismiss, opacityAnim, scaleAnim]);

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
                <Text style={styles.statsHighlight}>+{caloriesAdded} kcal</Text> counted toward today&apos;s goal
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
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
  },
  trophyGlow: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  trophyInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  streakPillText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statsText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  statsHighlight: {
    color: '#10B981',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 18,
    width: '100%',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
});
