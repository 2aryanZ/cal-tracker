import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { X, Scale, Check, Calendar } from 'lucide-react-native';
import { PALETTE, FONTS } from '@/constants/theme';
import { lbsToKg, kgToLbs } from '@/services/tdeeCalculator';
import { getTodayDateString } from '@/services/storage';

interface WeightLogModalProps {
  visible: boolean;
  onClose: () => void;
  currentWeightKg: number;
  onSave: (data: { weightKg: number; weightLbs: number; date: string; note?: string }) => void;
}

export function WeightLogModal({
  visible,
  onClose,
  currentWeightKg,
  onSave,
}: WeightLogModalProps) {
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [weightLbs, setWeightLbs] = useState(String(kgToLbs(currentWeightKg || 78)));
  const [weightKg, setWeightKg] = useState(String(Math.round((currentWeightKg || 78) * 10) / 10));
  const [date, setDate] = useState(getTodayDateString());
  const [note, setNote] = useState('Morning weigh-in');

  const handleUnitToggle = (newUnit: 'lbs' | 'kg') => {
    if (newUnit === unit) return;
    if (newUnit === 'lbs') {
      const kg = Number(weightKg) || 78;
      setWeightLbs(String(kgToLbs(kg)));
    } else {
      const lbs = Number(weightLbs) || 165;
      setWeightKg(String(lbsToKg(lbs)));
    }
    setUnit(newUnit);
  };

  const handleSave = () => {
    let finalKg = Number(weightKg) || 78;
    let finalLbs = Number(weightLbs) || 165;

    if (unit === 'lbs') {
      finalKg = lbsToKg(finalLbs);
    } else {
      finalLbs = kgToLbs(finalKg);
    }

    onSave({
      weightKg: finalKg,
      weightLbs: finalLbs,
      date,
      note: note.trim() || undefined,
    });
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Scale size={18} color={PALETTE[950]} />
              <Text style={styles.modalTitle}>Record Weigh-in</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={PALETTE[600]} />
            </TouchableOpacity>
          </View>

          {/* Unit Toggle */}
          <View style={styles.unitToggleRow}>
            <TouchableOpacity
              style={[styles.unitBtn, unit === 'lbs' && styles.unitBtnActive]}
              onPress={() => handleUnitToggle('lbs')}>
              <Text style={[styles.unitBtnText, unit === 'lbs' && styles.unitBtnTextActive]}>
                Pounds (lbs)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitBtn, unit === 'kg' && styles.unitBtnActive]}
              onPress={() => handleUnitToggle('kg')}>
              <Text style={[styles.unitBtnText, unit === 'kg' && styles.unitBtnTextActive]}>
                Kilograms (kg)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weight Input Box */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>ENTER BODY WEIGHT</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={unit === 'lbs' ? weightLbs : weightKg}
                onChangeText={(v) => {
                  if (unit === 'lbs') {
                    setWeightLbs(v);
                    setWeightKg(String(lbsToKg(Number(v) || 0)));
                  } else {
                    setWeightKg(v);
                    setWeightLbs(String(kgToLbs(Number(v) || 0)));
                  }
                }}
                keyboardType="numeric"
                style={styles.weightTextInput}
                autoFocus
              />
              <Text style={styles.unitSuffixText}>{unit}</Text>
            </View>
          </View>

          {/* Date & Note Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DATE</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                style={styles.metaInput}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>CONTEXT NOTE</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                style={styles.metaInput}
                placeholder="e.g. Fasted morning"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Check size={16} color={PALETTE[50]} />
            <Text style={styles.saveBtnText}>Save Entry</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 35, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: PALETTE[100],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    fontFamily: FONTS.serif,
    fontSize: 16,
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
  unitToggleRow: {
    flexDirection: 'row',
    backgroundColor: PALETTE[100],
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  unitBtnActive: {
    backgroundColor: PALETTE.white,
  },
  unitBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[600],
  },
  unitBtnTextActive: {
    color: PALETTE[950],
  },
  inputContainer: {
    backgroundColor: PALETTE[50],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '800',
    color: PALETTE[600],
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  weightTextInput: {
    fontFamily: FONTS.serif,
    fontSize: 32,
    fontWeight: '700',
    color: PALETTE[950],
    flex: 1,
    padding: 0,
  },
  unitSuffixText: {
    fontFamily: FONTS.sans,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[500],
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '800',
    color: PALETTE[600],
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  metaInput: {
    backgroundColor: PALETTE[50],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[950],
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  saveBtn: {
    backgroundColor: PALETTE[950],
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[50],
  },
});
