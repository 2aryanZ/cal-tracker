import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculateNutritionPlan, cmToFtIn, ftInToCm, kgToLbs, lbsToKg } from '@/services/tdeeCalculator';
import type { UserProfile, FitnessGoal, ActivityLevel } from '@/services/tdeeCalculator';
import type { MacroTargets } from '@/types/nutrition';
import { validateProfile } from '@/services/nutritionRules';
import { PALETTE, FONTS, JOURNAL } from '@/constants/theme';
interface Props {
    visible: boolean;
    onClose: () => void;
    initialProfile: UserProfile;
    onComplete: (profile: UserProfile, targets: MacroTargets) => void | Promise<void>;
}
function Content({ initialProfile, onComplete, onClose }: Omit<Props, 'visible'>) {
    const [unit, setUnit] = useState(initialProfile.unitSystem), [gender, setGender] = useState(initialProfile.gender), [goal, setGoal] = useState(initialProfile.goal), [activity, setActivity] = useState(initialProfile.activityLevel);
    const [age, setAge] = useState(String(initialProfile.age)), [steps, setSteps] = useState(String(initialProfile.dailySteps)), [weight, setWeight] = useState(String(initialProfile.unitSystem === 'metric' ? initialProfile.weightKg : kgToLbs(initialProfile.weightKg))), [target, setTarget] = useState(String(initialProfile.unitSystem === 'metric' ? initialProfile.targetWeightKg : kgToLbs(initialProfile.targetWeightKg))), [height, setHeight] = useState(String(initialProfile.heightCm)), [feet, setFeet] = useState(String(cmToFtIn(initialProfile.heightCm).feet)), [inches, setInches] = useState(String(cmToFtIn(initialProfile.heightCm).inches));
    const [review, setReview] = useState<{
        profile: UserProfile;
        targets: MacroTargets;
    } | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const switchUnits = (next: 'metric' | 'imperial') => { if (next === unit)
        return; setReview(null); if (next === 'imperial') {
        setWeight(String(kgToLbs(Number(weight))));
        setTarget(String(kgToLbs(Number(target))));
        const h = cmToFtIn(Number(height));
        setFeet(String(h.feet));
        setInches(String(h.inches));
    }
    else {
        setWeight(String(lbsToKg(Number(weight))));
        setTarget(String(lbsToKg(Number(target))));
        setHeight(String(ftInToCm(Number(feet), Number(inches))));
    } setUnit(next); };
    const calculate = () => { setError(''); try {
        if ([age, weight, target, steps, ...(unit === 'metric' ? [height] : [feet, inches])].some(v => !v.trim()))
            throw new Error('Fill in each profile field.');
        if (unit === 'imperial' && (Number(inches) < 0 || Number(inches) >= 12))
            throw new Error('Inches must be between 0 and 11.');
        const profile: UserProfile = { age: Number(age), gender, goal, activityLevel: activity, unitSystem: unit, dailySteps: Number(steps), heightCm: unit === 'metric' ? Number(height) : ftInToCm(Number(feet), Number(inches)), weightKg: unit === 'metric' ? Number(weight) : lbsToKg(Number(weight)), targetWeightKg: unit === 'metric' ? Number(target) : lbsToKg(Number(target)) };
        validateProfile(profile);
        if (goal === 'fat_loss' && profile.targetWeightKg > profile.weightKg)
            throw new Error('Choose a weight loss target below your current weight.');
        if (goal === 'muscle_gain' && profile.targetWeightKg < profile.weightKg)
            throw new Error('Choose a weight gain target above your current weight.');
        setReview({ profile, targets: calculateNutritionPlan(profile).macros });
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Check your profile.');
    } };
    const save = async () => { if (!review || busy)
        return; setBusy(true); setError(''); try {
        await onComplete(review.profile, review.targets);
        onClose();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to save your profile.');
    }
    finally {
        setBusy(false);
    } };
    const field = (label: string, value: string, change: (v: string) => void) => <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={v => { change(v); setReview(null); }} keyboardType="decimal-pad" style={styles.input}/></View>;
    return <SafeAreaView style={styles.page}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled"><View style={styles.header}><Text style={styles.title}>Your profile</Text><TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.button}><Text>Close</Text></TouchableOpacity></View><Text style={styles.note}>Set your own targets, then review the estimated calorie and macro plan.</Text>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}<View style={styles.row}>{(['metric', 'imperial'] as const).map(u => <TouchableOpacity key={u} accessibilityRole="button" accessibilityState={{ selected: unit === u }} onPress={() => switchUnits(u)} style={[styles.button, unit === u && styles.active]}><Text>{u}</Text></TouchableOpacity>)}</View>{field('Age', age, setAge)}<View style={styles.row}>{(['male', 'female'] as const).map(g => <TouchableOpacity key={g} accessibilityRole="button" accessibilityState={{ selected: gender === g }} onPress={() => { setGender(g); setReview(null); }} style={[styles.button, gender === g && styles.active]}><Text>{g}</Text></TouchableOpacity>)}</View>{unit === 'metric' ? field('Height (cm)', height, setHeight) : <>{field('Height (feet)', feet, setFeet)}{field('Height (inches)', inches, setInches)}</>}{field(`Current weight (${unit === 'metric' ? 'kg' : 'lbs'})`, weight, setWeight)}{field(`Target weight (${unit === 'metric' ? 'kg' : 'lbs'})`, target, setTarget)}{field('Daily steps', steps, setSteps)}<Text style={styles.label}>Goal</Text><View style={styles.row}>{(['fat_loss', 'muscle_gain', 'maintenance', 'recomposition'] as FitnessGoal[]).map(g => <TouchableOpacity key={g} accessibilityRole="button" accessibilityState={{ selected: goal === g }} style={[styles.button, goal === g && styles.active]} onPress={() => { setGoal(g); setReview(null); }}><Text>{g.replaceAll('_', ' ')}</Text></TouchableOpacity>)}</View><Text style={styles.label}>Activity</Text><View style={styles.row}>{(['sedentary', 'light', 'moderate', 'very_active'] as ActivityLevel[]).map(a => <TouchableOpacity key={a} accessibilityRole="button" accessibilityState={{ selected: activity === a }} style={[styles.button, activity === a && styles.active]} onPress={() => { setActivity(a); setReview(null); }}><Text>{a.replaceAll('_', ' ')}</Text></TouchableOpacity>)}</View>{review ? <View style={styles.card}><Text style={styles.title}>{review.targets.calories} kcal/day</Text><Text style={styles.note}>Protein {review.targets.protein}g · Carbs {review.targets.carbs}g · Fat {review.targets.fats}g</Text><Text style={styles.note}>Water target {review.targets.waterMl} ml — adjustable in Settings.</Text><TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.primary} onPress={save}>{busy ? <ActivityIndicator color="white"/> : <Text style={styles.primaryText}>Save reviewed plan</Text>}</TouchableOpacity></View> : <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={calculate}><Text style={styles.primaryText}>Review calculated targets</Text></TouchableOpacity>}</ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function OnboardingModal(props: Props) { if (!props.visible)
    return null; return <Modal animationType="none" onRequestClose={props.onClose}><Content {...props}/></Modal>; }
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: PALETTE[50] }, body: { padding: 24, paddingBottom: 48 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontFamily: FONTS.serif, fontSize: 28, color: PALETTE[950] }, note: { fontSize: 14, lineHeight: 22, color: PALETTE[600], marginVertical: 12 }, field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 }, label: { fontSize: 16, color: PALETTE[950] }, input: { minHeight: 48, width: 112, fontSize: 16, padding: 12, backgroundColor: 'white', borderRadius: 12 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 }, button: { minHeight: 44, padding: 12, justifyContent: 'center', backgroundColor: 'white', borderRadius: 12 }, active: { backgroundColor: PALETTE[200] }, primary: { minHeight: 48, backgroundColor: PALETTE[900], borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginVertical: 16 }, primaryText: { fontSize: 16, color: 'white' }, card: { backgroundColor: 'white', padding: 20, borderRadius: 18, marginVertical: 16 }, error: { fontSize: 14, color: JOURNAL.error, lineHeight: 21 } });
