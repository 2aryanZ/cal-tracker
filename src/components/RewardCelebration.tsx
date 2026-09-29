import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { CircleCheck } from 'lucide-react-native';
import { JOURNAL, FONTS } from '@/constants/theme';
import { triggerGoalCelebrationHaptic } from '@/services/hapticsService';
interface Props {
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
  onDismiss,
}: Props) {
  useEffect(() => {
    if (visible) triggerGoalCelebrationHaptic();
  }, [visible]);
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <CircleCheck size={40} color={JOURNAL.accent} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>{subtitle}</Text>
          <Text style={styles.text}>
            {streak} {streak === 1 ? 'day' : 'days'} of consistent logging
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Back to your journal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: JOURNAL.scrim,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderRadius: 20,
    backgroundColor: JOURNAL.surface,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 26,
    color: JOURNAL.ink,
    textAlign: 'center',
  },
  text: {
    fontSize: 15,
    lineHeight: 23,
    color: JOURNAL.muted,
    textAlign: 'center',
  },
  button: {
    minHeight: 52,
    paddingHorizontal: 24,
    justifyContent: 'center',
    backgroundColor: JOURNAL.accent,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: { fontSize: 15, color: JOURNAL.surface },
});
