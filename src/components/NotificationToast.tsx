import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Info from 'lucide-react-native/icons/info';
import X from 'lucide-react-native/icons/x';
import type { ToastNotification } from '@/types/nutrition';
import { JOURNAL, FONTS } from '@/constants/theme';
export function NotificationToast({
  toast,
  onDismiss,
}: {
  toast: ToastNotification | null;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);
  if (!toast) return null;
  return (
    <View
      style={[styles.container, { top: insets.top + 8 }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.card}>
        <Info size={18} color={JOURNAL.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{toast.title}</Text>
          <Text style={styles.message}>{toast.message}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          onPress={onDismiss}
          style={styles.close}
        >
          <X size={18} color={JOURNAL.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 10,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 436,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: JOURNAL.surface,
    borderWidth: 1,
    borderColor: JOURNAL.line,
    borderRadius: 16,
    paddingLeft: 16,
    paddingVertical: 8,
    shadowColor: JOURNAL.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  title: { fontFamily: FONTS.sans,
    fontSize: 15,
    fontWeight: '600',
    color: JOURNAL.ink,
    lineHeight: 22,
  },
  message: { fontFamily: FONTS.sans,  fontSize: 13, lineHeight: 20, color: JOURNAL.muted },
  close: {
    width: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
