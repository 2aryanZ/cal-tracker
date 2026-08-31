import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Universal Haptics Engine for Cal Tracker
 * Provides tactile physical feedback on taps, sliders, modal reveals, and goal completions.
 */

export function triggerLightImpact(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

export function triggerMediumImpact(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
}

export function triggerHeavyImpact(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {}
}

export function triggerSelection(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.selectionAsync();
  } catch {}
}

export function triggerSuccessFeedback(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

export function triggerWarningFeedback(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
}

export function triggerGoalCelebrationHaptic(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 150);
  } catch {}
}
