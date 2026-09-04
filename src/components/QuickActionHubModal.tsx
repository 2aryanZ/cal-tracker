import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Camera,
  QrCode,
  Mic,
  ChefHat,
  Scale,
  Utensils,
  X,
  Sparkles,
} from 'lucide-react-native';
import { PALETTE, FONTS } from '@/constants/theme';
import { triggerLightImpact } from '@/services/hapticsService';

interface QuickActionHubModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: 'scan_food' | 'barcode' | 'voice_log' | 'meal_plan' | 'log_weight' | 'quick_meal') => void;
}

export function QuickActionHubModal({
  visible,
  onClose,
  onSelectAction,
}: QuickActionHubModalProps) {
  const handleAction = (action: 'scan_food' | 'barcode' | 'voice_log' | 'meal_plan' | 'log_weight' | 'quick_meal') => {
    triggerLightImpact();
    onClose();
    onSelectAction(action);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.sheetContainer} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Sparkles size={16} color={PALETTE[950]} />
              <Text style={styles.title}>Quick Actions Hub</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={PALETTE[600]} />
            </TouchableOpacity>
          </View>

          {/* Primary Top Action: AI Food Camera Scanner */}
          <TouchableOpacity
            style={styles.primaryHeroCard}
            onPress={() => handleAction('scan_food')}
            activeOpacity={0.85}>
            <View style={styles.primaryIconBox}>
              <Camera size={22} color={PALETTE[50]} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.primaryTitle}>AI Food Scanner</Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>Visual Vision</Text>
                </View>
              </View>
              <Text style={styles.primarySub}>
                Snap photo for instant calories, macros & ingredient breakdown
              </Text>
            </View>
          </TouchableOpacity>

          {/* 2x2 Grid of Secondary Actions */}
          <View style={styles.gridRow}>
            {/* Barcode Scanner */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => handleAction('barcode')}
              activeOpacity={0.8}>
              <View style={[styles.gridIconBox, { backgroundColor: '#F0FDF4' }]}>
                <QrCode size={18} color="#059669" />
              </View>
              <Text style={styles.gridTitle}>Barcode Scan</Text>
              <Text style={styles.gridSub}>Instant product lookup</Text>
            </TouchableOpacity>

            {/* Voice Food Logger */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => handleAction('voice_log')}
              activeOpacity={0.8}>
              <View style={[styles.gridIconBox, { backgroundColor: '#FDF2F8' }]}>
                <Mic size={18} color="#DB2777" />
              </View>
              <Text style={styles.gridTitle}>Voice Log</Text>
              <Text style={styles.gridSub}>Natural speech to meal</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gridRow}>
            {/* AI Meal Planner */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => handleAction('meal_plan')}
              activeOpacity={0.8}>
              <View style={[styles.gridIconBox, { backgroundColor: '#EFF6FF' }]}>
                <ChefHat size={18} color="#2563EB" />
              </View>
              <Text style={styles.gridTitle}>AI Meal Plan</Text>
              <Text style={styles.gridSub}>Generate day blueprint</Text>
            </TouchableOpacity>

            {/* Log Body Weight */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => handleAction('log_weight')}
              activeOpacity={0.8}>
              <View style={[styles.gridIconBox, { backgroundColor: PALETTE[100] }]}>
                <Scale size={18} color={PALETTE[700]} />
              </View>
              <Text style={styles.gridTitle}>Log Weight</Text>
              <Text style={styles.gridSub}>Update progress curve</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Manual Entry Strip */}
          <TouchableOpacity
            style={styles.manualEntryBtn}
            onPress={() => handleAction('quick_meal')}
            activeOpacity={0.85}>
            <Utensils size={14} color={PALETTE[950]} />
            <Text style={styles.manualEntryText}>Quick Manual Food Entry</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 35, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: PALETTE.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE[950],
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: PALETTE[900],
    borderRadius: 16,
    padding: 14,
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(218, 237, 235, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  primaryTitle: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE[50],
  },
  aiBadge: {
    backgroundColor: 'rgba(218, 237, 235, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiBadgeText: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '700',
    color: PALETTE[50],
  },
  primarySub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[200],
    lineHeight: 15,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCard: {
    flex: 1,
    backgroundColor: PALETTE[50],
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  gridIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridTitle: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  gridSub: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[600],
    marginTop: 1,
  },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: PALETTE[50],
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  manualEntryText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[950],
  },
});
