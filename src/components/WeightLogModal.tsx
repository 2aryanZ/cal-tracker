import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { JOURNAL, FONTS } from '@/constants/theme';
import { lbsToKg, kgToLbs } from '@/services/tdeeCalculator';
import { getTodayDateString } from '@/services/storage';
import { validateWeight } from '@/services/nutritionRules';
interface Props {
  visible: boolean;
  onClose: () => void;
  currentWeightKg: number;
  initialUnit?: 'lbs' | 'kg';
  onSave: (data: {
    weightKg: number;
    weightLbs: number;
    date: string;
    note?: string;
  }) => void | Promise<void>;
}
function WeightForm({
  onClose,
  currentWeightKg,
  initialUnit = 'kg',
  onSave,
}: Omit<Props, 'visible'>) {
  const [unit, setUnit] = useState(initialUnit),
    [value, setValue] = useState(
      String(initialUnit === 'kg' ? currentWeightKg : kgToLbs(currentWeightKg)),
    ),
    [date, setDate] = useState(getTodayDateString()),
    [note, setNote] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const changeUnit = (next: 'kg' | 'lbs') => {
    if (next === unit) return;
    if (value.trim() && Number.isFinite(Number(value)))
      setValue(
        String(next === 'kg' ? lbsToKg(Number(value)) : kgToLbs(Number(value))),
      );
    setUnit(next);
  };
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (!value.trim()) throw new Error('Enter your weight.');
      const kg = unit === 'kg' ? Number(value) : lbsToKg(Number(value));
      validateWeight({ date, weightKg: kg });
      await onSave({
        weightKg: kg,
        weightLbs: kgToLbs(kg),
        date,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save weight.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.body}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Log your weight</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close weigh-in"
              disabled={busy}
              onPress={onClose}
              style={styles.close}
            >
              <X size={22} color={JOURNAL.ink} />
            </TouchableOpacity>
          </View>
          <Text style={styles.caption}>
            Record a weigh-in at your own pace.
          </Text>
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <View style={styles.units}>
            {(['kg', 'lbs'] as const).map((u) => (
              <TouchableOpacity
                key={u}
                accessibilityRole="button"
                accessibilityState={{ selected: unit === u }}
                style={[styles.unit, unit === u && styles.active]}
                onPress={() => changeUnit(u)}
              >
                <Text style={styles.text}>
                  {u === 'kg' ? 'Kilograms (kg)' : 'Pounds (lbs)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Body weight ({unit})</Text>
          <TextInput
            accessibilityLabel={`Body weight (${unit})`}
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
            style={styles.input}
          />
          <Text style={styles.label}>Date</Text>
          <TextInput
            accessibilityLabel="Weigh-in date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            style={styles.input}
          />
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            accessibilityLabel="Weigh-in note"
            value={note}
            onChangeText={setNote}
            placeholder="For example, before breakfast"
            multiline
            style={styles.input}
          />
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void save()}
            style={[styles.save, busy && { opacity: 0.6 }]}
          >
            {busy ? (
              <ActivityIndicator
                accessibilityLabel="Saving weigh-in"
                color={JOURNAL.surface}
              />
            ) : (
              <Text style={styles.saveText}>Save Entry</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function WeightLogModal(props: Props) {
  if (!props.visible) return null;
  return (
    <Modal visible animationType="none" onRequestClose={props.onClose}>
      <WeightForm {...props} />
    </Modal>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: JOURNAL.paper },
  body: {
    padding: 24,
    paddingBottom: 40,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: { fontFamily: FONTS.serif, fontSize: 30, color: JOURNAL.ink, flex: 1 },
  close: {
    width: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    fontSize: 14,
    color: JOURNAL.muted,
    lineHeight: 22,
    marginTop: 12,
  },
  units: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 24 },
  unit: {
    minHeight: 48,
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: JOURNAL.surface,
  },
  active: {
    backgroundColor: JOURNAL.soft,
    borderWidth: 1,
    borderColor: JOURNAL.line,
  },
  text: { fontSize: 15, color: JOURNAL.ink },
  label: { fontSize: 14, color: JOURNAL.muted, marginTop: 24, marginBottom: 8 },
  input: {
    minHeight: 52,
    padding: 14,
    borderWidth: 1,
    borderColor: JOURNAL.line,
    borderRadius: 12,
    backgroundColor: JOURNAL.surface,
    fontSize: 16,
    color: JOURNAL.ink,
  },
  save: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: JOURNAL.accent,
    borderRadius: 12,
    marginTop: 32,
  },
  saveText: { fontSize: 16, fontWeight: '600', color: JOURNAL.surface },
  error: { color: JOURNAL.error, fontSize: 14, lineHeight: 22, marginTop: 16 },
});
