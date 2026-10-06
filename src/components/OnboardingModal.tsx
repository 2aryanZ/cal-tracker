import React, { useRef, useState } from 'react';
import {
  View, Text, Modal, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculateNutritionPlan } from '@/services/tdeeCalculator';
import type { UserProfile } from '@/services/tdeeCalculator';
import type { MacroTargets } from '@/types/nutrition';
import {
  profileDraft, convertDraftUnits, draftErrors, reviewedProfile,
} from '@/services/onboardingRules';
import type { ProfileDraft, DraftErrors } from '@/services/onboardingRules';
import { FONTS, JOURNAL as C } from '@/constants/theme';
interface Props {
  visible: boolean;
  onClose: () => void;
  initialProfile: UserProfile;
  firstSetup: boolean;
  onComplete: (profile: UserProfile, targets: MacroTargets) => void | Promise<void>;
}
const goals = [
  ['fat_loss', 'Lose weight'], ['muscle_gain', 'Gain weight'],
  ['maintenance', 'Maintain weight'], ['recomposition', 'Body recomposition'],
] as const;
const activities = [
  ['sedentary', 'Mostly sitting'], ['light', 'Lightly active'],
  ['moderate', 'Moderately active'], ['very_active', 'Very active'],
] as const;
function Content({ initialProfile, firstSetup, onComplete, onClose }: Omit<Props, 'visible'>) {
  const [draft, setDraft] = useState(() => profileDraft(initialProfile, firstSetup));
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const [review, setReview] = useState<{ profile: UserProfile; targets: MacroTargets } | null>(null);
  const change = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
    setError('');
    setReview(null);
  };
  const move = (next: 0 | 1 | 2) => {
    setStep(next);
    setErrors({});
    setError('');
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const next = () => {
    if (step === 2) return;
    const invalid = draftErrors(draft, step);
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      setError('Check the highlighted fields below.');
      scroll.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    if (step === 0) move(1);
    else {
      try {
        const profile = reviewedProfile(draft);
        setReview({ profile, targets: calculateNutritionPlan(profile).macros });
        move(2);
      } catch (e) { setError(e instanceof Error ? e.message : 'Check your details.'); }
    }
  };
  const save = async () => {
    if (!review || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await onComplete(review.profile, review.targets);
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Please try again.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const inlineError = (key: keyof ProfileDraft) => errors[key]
    ? <Text accessibilityRole="alert" style={styles.error}>{errors[key]}</Text> : null;
  const field = (key: keyof ProfileDraft, label: string, example: string, integer = false) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={errors[key] || `Example: ${example}`}
        value={draft[key]}
        placeholder={`e.g. ${example}`}
        placeholderTextColor={C.muted}
        onChangeText={(value) => change(key, value)}
        onBlur={() => {
          if (step < 2) setErrors((previous) => ({ ...previous, [key]: draftErrors(draft, step as 0 | 1)[key] }));
        }}
        keyboardType={integer ? 'number-pad' : 'decimal-pad'}
        style={[styles.input, errors[key] && styles.invalid]}
      />
      {inlineError(key)}
    </View>
  );
  const options = <K extends 'gender' | 'goal' | 'activity'>(key: K, label: string, choices: readonly (readonly [ProfileDraft[K], string])[]) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {choices.map(([value, title]) => (
          <TouchableOpacity key={value} accessibilityRole="button"
            accessibilityState={{ selected: draft[key] === value }}
            style={[styles.button, draft[key] === value && styles.active]}
            onPress={() => change(key, value)}>
            <Text style={styles.text}>{title}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {inlineError(key)}
    </View>
  );
  const weightUnit = draft.unit === 'metric' ? 'kg' : 'lbs';
  return (
    <Modal animationType="none" onRequestClose={() => { if (!saving.current) onClose(); }}>
    <SafeAreaView style={styles.page} accessibilityViewIsModal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>{firstSetup ? 'Your own pace' : 'Your profile'}</Text>
            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={onClose} style={styles.button}>
              <Text style={styles.text}>{firstSetup ? 'Not now' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.note}>Step {step + 1} of 3 · {['Body details', 'Goals & activity', 'Review your plan'][step]}</Text>
          <Text style={styles.note}>{firstSetup
            ? 'Use your own details to estimate a starting plan. You can also start your journal now and set manual targets in Profile.'
            : 'Review your details and the estimated plan before saving.'}</Text>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {step === 0 && <>
            <Text style={styles.label}>Measurement units</Text>
            <View style={styles.row}>
              {(['metric', 'imperial'] as const).map((unit) => (
                <TouchableOpacity key={unit} accessibilityRole="button" accessibilityState={{ selected: draft.unit === unit }}
                  style={[styles.button, draft.unit === unit && styles.active]}
                  onPress={() => { setDraft((value) => convertDraftUnits(value, unit)); setErrors({}); setReview(null); }}>
                  <Text style={styles.text}>{unit === 'metric' ? 'Metric · kg / cm' : 'Imperial · lbs / ft'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {field('age', 'Age (years)', '26', true)}
            {options('gender', 'Sex used for the calorie estimate', [['male', 'Male'], ['female', 'Female']])}
            {draft.unit === 'metric' ? field('height', 'Height (cm)', '175') : <>
              {field('feet', 'Height (feet)', '5', true)}
              {field('inches', 'Height (inches)', '0')}
            </>}
            {field('weight', `Current weight (${weightUnit})`, draft.unit === 'metric' ? '70' : '154')}
          </>}
          {step === 1 && <>
            {options('goal', 'Your goal', goals)}
            {field('target', `Target weight (${weightUnit})`, draft.unit === 'metric' ? '68' : '150')}
            {options('activity', 'Usual activity level', activities)}
            <Text style={styles.note}>Choose the level that describes your typical day, including exercise.</Text>
            {field('steps', 'Typical daily steps', '5000', true)}
          </>}
          {step === 2 && review && <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.label}>Your reviewed details</Text>
            <Text style={styles.note}>{draft.age} years · {draft.gender} · {draft.unit === 'metric' ? `${draft.height} cm` : `${draft.feet} ft ${draft.inches} in`}</Text>
            <Text style={styles.note}>{draft.weight} → {draft.target} {weightUnit} · {goals.find(([id]) => id === draft.goal)?.[1]}</Text>
            <Text style={styles.note}>{activities.find(([id]) => id === draft.activity)?.[1]} · {draft.steps} steps/day</Text>
            <Text style={styles.plan}>{review.targets.calories.toLocaleString()} kcal/day</Text>
            <Text style={styles.note}>Protein {review.targets.protein} g · Carbs {review.targets.carbs} g · Fat {review.targets.fats} g</Text>
            <Text style={styles.note}>Water {review.targets.waterMl} ml/day</Text>
            <Text style={styles.note}>These are starting estimates. You can adjust targets in Profile.</Text>
          </View>}
          <View style={styles.row}>
            {step > 0 && <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => move(step === 2 ? 1 : 0)}>
              <Text style={styles.text}>Back</Text>
            </TouchableOpacity>}
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy}
              style={[styles.primary, busy && { opacity: 0.6 }]} onPress={step === 2 ? save : next}>
              {busy ? <ActivityIndicator color={C.ink} /> : <Text style={styles.primaryText}>{step === 2 ? 'Save reviewed plan' : step === 1 ? 'Review my plan' : 'Continue'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </Modal>
  );
}
export function OnboardingModal(props: Props) {
  if (!props.visible) return null;
  return <Content {...props} />;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper },
  body: { padding: 24, paddingBottom: 48, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontFamily: FONTS.bold, fontSize: 28, color: C.ink, flexShrink: 1 },
  note: { fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22, color: C.muted, marginVertical: 8 },
  field: { marginVertical: 12, gap: 8 },
  label: { fontFamily: FONTS.semibold, fontSize: 16, lineHeight: 24, color: C.ink },
  input: { fontFamily: FONTS.sans, minHeight: 48, fontSize: 16, padding: 12, color: C.ink, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12 },
  invalid: { borderColor: C.error },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  button: { minHeight: 48, padding: 12, justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12 },
  active: { backgroundColor: C.soft, borderColor: C.accent },
  text: { fontFamily: FONTS.sans, fontSize: 14, color: C.ink },
  primary: { minHeight: 48, flexGrow: 1, padding: 14, backgroundColor: C.lime, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: FONTS.bold, fontSize: 16, color: C.ink },
  card: { backgroundColor: C.surface, padding: 20, borderRadius: 18, marginVertical: 16 },
  plan: { fontFamily: FONTS.bold, fontSize: 28, lineHeight: 38, color: C.ink, marginTop: 16 },
  error: { fontFamily: FONTS.sans, fontSize: 14, color: C.error, lineHeight: 22 },
});
