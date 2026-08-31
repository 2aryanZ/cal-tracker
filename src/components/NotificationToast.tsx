import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Bell, Flame, X, Utensils } from 'lucide-react-native';
import { ToastNotification } from '@/types/nutrition';
import { PALETTE, FONTS } from '@/constants/theme';

interface NotificationToastProps {
  toast: ToastNotification | null;
  onDismiss: () => void;
}

export function NotificationToast({ toast, onDismiss }: NotificationToastProps) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleClose();
      }, 4500);

      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          {toast.icon === 'flame' ? (
            <Flame size={18} color={PALETTE[700]} fill={PALETTE[700]} />
          ) : toast.icon === 'utensils' ? (
            <Utensils size={18} color={PALETTE[600]} />
          ) : (
            <Bell size={18} color={PALETTE[950]} />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.appTag}>CAL TRACKER REMINDER</Text>
            <Text style={styles.timeTag}>Now</Text>
          </View>
          <Text style={styles.title}>{toast.title}</Text>
          <Text style={styles.message} numberOfLines={2}>
            {toast.message}
          </Text>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
          <X size={14} color={PALETTE[400]} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: PALETTE[200],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    gap: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PALETTE[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  appTag: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '800',
    color: PALETTE[600],
    letterSpacing: 0.8,
  },
  timeTag: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[400],
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[950],
    marginBottom: 1,
  },
  message: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    lineHeight: 15,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
