import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { parseVoiceMealTranscript } from '@/services/mealPlanService';
import type { AiFoodDetectionResult, MealType } from '@/types/nutrition';
import { PALETTE, FONTS, JOURNAL } from '@/constants/theme';
interface Props {
    visible: boolean;
    onClose: () => void;
    onConfirm: (result: AiFoodDetectionResult, mealType: MealType) => void | Promise<void>;
    defaultMealType?: MealType;
}
function Content({ onClose, onConfirm, defaultMealType = 'lunch' }: Omit<Props, 'visible'>) {
    const [text, setText] = useState(''), [slot, setSlot] = useState<MealType>(defaultMealType), [result, setResult] = useState<AiFoodDetectionResult | null>(null), [busy, setBusy] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('');
    const controller = useRef<AbortController | null>(null), revision = useRef(0);
    useEffect(() => () => { controller.current?.abort(); }, []);
    const edit = (value: string) => { revision.current++; controller.current?.abort(); setText(value); setResult(null); setBusy(false); setError(''); };
    const parse = async () => { const token = ++revision.current; controller.current?.abort(); const request = new AbortController(); controller.current = request; setBusy(true); setError(''); try {
        const value = await parseVoiceMealTranscript(text, slot, request.signal);
        if (token === revision.current)
            setResult(value);
    }
    catch (e) {
        if (token === revision.current && !request.signal.aborted)
            setError(e instanceof Error ? e.message : 'Unable to analyze the description.');
    }
    finally {
        if (token === revision.current)
            setBusy(false);
    } };
    const save = async () => { if (!result || saving)
        return; setSaving(true); setError(''); try {
        await onConfirm(result, slot);
        onClose();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to save.');
    }
    finally {
        setSaving(false);
    } };
    return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}><View style={styles.sheet}><ScrollView keyboardShouldPersistTaps="handled"><View style={styles.header}><Text style={styles.title}>Describe a meal</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close meal description" onPress={onClose} style={styles.button}><Text>Close</Text></TouchableOpacity></View><Text style={styles.note}>Type your meal and quantities. You can use the dictation button on your phone’s keyboard.</Text><View style={styles.row}>{(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(s => <TouchableOpacity key={s} accessibilityRole="button" accessibilityState={{ selected: slot === s }} style={[styles.pill, slot === s && styles.active]} onPress={() => setSlot(s)}><Text>{s}</Text></TouchableOpacity>)}</View><TextInput accessibilityLabel="Meal description" placeholder="For example: two eggs, one slice of toast and black coffee" value={text} onChangeText={edit} multiline style={styles.input}/>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}<TouchableOpacity accessibilityRole="button" onPress={parse} disabled={busy || !text.trim() || saving} style={styles.primary}>{busy ? <ActivityIndicator color="white"/> : <Text style={styles.primaryText}>Estimate nutrition</Text>}</TouchableOpacity>{result && <View style={styles.result}><Text style={styles.title}>{result.foodName}</Text><Text style={styles.note}>{result.servingSize} · estimate, review before logging</Text><Text>{result.calories} kcal · P {result.protein}g · C {result.carbs}g · F {result.fats}g</Text><TouchableOpacity accessibilityRole="button" onPress={save} disabled={saving} style={styles.primary}>{saving ? <ActivityIndicator color="white"/> : <Text style={styles.primaryText}>Log eaten meal</Text>}</TouchableOpacity></View>}</ScrollView></View></KeyboardAvoidingView>;
}
export function VoiceLogModal(props: Props) { if (!props.visible)
    return null; return <Modal transparent animationType="none" onRequestClose={props.onClose}><Content {...props}/></Modal>; }
const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: JOURNAL.scrim, justifyContent: 'flex-end' }, sheet: { maxHeight: '90%', backgroundColor: PALETTE.white, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontFamily: FONTS.serif, fontSize: 22, color: PALETTE[950] }, note: { fontSize: 14, lineHeight: 21, color: PALETTE[600], marginVertical: 12 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, pill: { minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: PALETTE[50] }, active: { backgroundColor: PALETTE[200] }, button: { minHeight: 44, minWidth: 44, justifyContent: 'center' }, input: { minHeight: 120, padding: 16, backgroundColor: PALETTE[50], fontSize: 16, borderRadius: 16, marginVertical: 16 }, primary: { minHeight: 48, backgroundColor: PALETTE[900], borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginVertical: 12 }, primaryText: { fontSize: 16, color: 'white' }, result: { padding: 16, backgroundColor: PALETTE[50], borderRadius: 16, marginTop: 16 }, error: { color: JOURNAL.error, fontSize: 14, lineHeight: 20 } });
