import React, { useEffect, useRef, useCallback } from 'react';
import { Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
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

  const handleClose = useCallback(() => {
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
  }, [onDismiss, opacity, translateY]);

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
  }, [toast, handleClose, opacity, translateY]);

  if (!toast) return null;

  const renderIcon = () => {
    switch (toast.icon) {
      case 'flame':
        return <Flame size={18} color="#EA580C" fill="#EA580C" />;
      case 'utensils':
        return <Utensils size={18} color={PALETTE[700]} />;
      default:
        return <Bell size={18} color={PALETTE[950]} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}>
      <TouchableOpacity style={styles.toastCard} onPress={handleClose} activeOpacity={0.9}>
        <Animated.View style={styles.iconBox}>{renderIcon()}</Animated.View>
        <Animated.View style={styles.textBox}>
          <Text style={styles.titleText}>{toast.title}</Text>
          <Text style={styles.bodyText} numberOfLines={2}>
            {toast.message}
          </Text>
        </Animated.View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <X size={14} color={PALETTE[400]} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 44 : 54,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  textBox: {
    flex: 1,
    gap: 2,
  },
  titleText: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[950],
  },
  bodyText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[700],
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
  },
});
