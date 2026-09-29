import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Utensils, Plus, Droplet } from 'lucide-react-native';
import { JOURNAL, FONTS } from '@/constants/theme';
import { useNutrition } from '@/context/NutritionContext';
import { MealCard } from '@/components/MealCard';
import { MealResultModal } from '@/components/MealResultModal';
import { QuickActionHubModal } from '@/components/QuickActionHubModal';
import { VoiceLogModal } from '@/components/VoiceLogModal';
import { MealPlanModal } from '@/components/MealPlanModal';
import { WeightLogModal } from '@/components/WeightLogModal';
import { getTodayDateString } from '@/services/storage';
import type {
  MealType,
  FoodEntry,
  AiFoodDetectionResult,
  FavoriteMeal,
} from '@/types/nutrition';
const slots: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
function Meter({ value, target }: { value: number; target: number }) {
  const fraction = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: target, now: value }}
    >
      <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
    </View>
  );
}
export default function TodayScreen() {
  const router = useRouter();
  const {
    dailySummary,
    consumed,
    goals,
    waterMl,
    selectedDate,
    setSelectedDate,
    logMeal,
    editMeal,
    removeMeal,
    logWater,
    showToast,
    userProfile,
    dietaryPreference,
    addWeight,
  } = useNutrition();
  const [hub, setHub] = useState(false),
    [meal, setMeal] = useState(false),
    [voice, setVoice] = useState(false),
    [plan, setPlan] = useState(false),
    [weight, setWeight] = useState(false);
  const [editing, setEditing] = useState<FoodEntry | null>(null),
    [result, setResult] = useState<AiFoodDetectionResult | null>(null),
    [photo, setPhoto] = useState<string>(),
    [slot, setSlot] = useState<MealType>('lunch');
  const [draftSource, setDraftSource] = useState<FoodEntry['source']>('manual');
  const [waterBusy, setWaterBusy] = useState(false);
  // Returning from History must not leave the Today journal on a historical date.
  useFocusEffect(
    React.useCallback(() => {
      setSelectedDate(getTodayDateString());
    }, [setSelectedDate]),
  );
  const grouped = useMemo(
    () =>
      Object.fromEntries(
        slots.map((type) => [
          type,
          dailySummary.entries.filter((e) => e.mealType === type),
        ]),
      ) as Record<MealType, FoodEntry[]>,
    [dailySummary.entries],
  );
  const add = (type: MealType) => {
    setSlot(type);
    setDraftSource('manual');
    setEditing(null);
    setResult(null);
    setPhoto(undefined);
    setMeal(true);
  };
  const reuse = (item: FoodEntry | FavoriteMeal) => {
    setDraftSource(item.source ?? (item.isAiGenerated ? 'text' : 'manual'));
    setEditing(null);
    setSlot(item.mealType);
    setPhoto(item.imageUri);
    setResult({
      foodName: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
      servingSize: item.portionSize || '1 serving',
      confidence: 1,
      breakdown: item.ingredients,
    });
    setMeal(true);
  };
  const addWater = async () => {
    if (waterBusy) return;
    setWaterBusy(true);
    try {
      await logWater(250, getTodayDateString());
    } catch (e) {
      showToast(
        'Water not saved',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setWaterBusy(false);
    }
  };
  const date = new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
    'en-GB',
    { weekday: 'long', month: 'short', day: 'numeric' },
  );
  const remaining = goals.calories - consumed.calories;
  return (
    <SafeAreaView edges={['top']} style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandRow}>
          <View style={styles.brandGroup}>
            <Utensils size={22} color={JOURNAL.accent} />
            <Text style={styles.brand}>Cal Tracker</Text>
          </View>
          <Text style={styles.caption}>Food journal</Text>
        </View>
        <Text style={styles.date}>{date}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Your day, on a plate.
        </Text>
        <View style={styles.summary}>
          <Text style={styles.caption}>Calories logged</Text>
          <Text style={styles.number}>
            {Math.round(consumed.calories).toLocaleString('en-US')}{' '}
            <Text style={styles.numberUnit}>
              / {goals.calories.toLocaleString('en-US')} kcal
            </Text>
          </Text>
          <Meter value={consumed.calories} target={goals.calories} />
          <Text
            style={[
              styles.remaining,
              remaining < 0 && { color: JOURNAL.error },
            ]}
          >
            {Math.abs(Math.round(remaining)).toLocaleString('en-US')} kcal{' '}
            {remaining < 0 ? 'above your target' : 'remaining'}
          </Text>
        </View>
        <View style={styles.macros}>
          {(
            [
              { key: 'protein', label: 'Protein' },
              { key: 'carbs', label: 'Carbs' },
              { key: 'fats', label: 'Fat' },
            ] as const
          ).map(({ key, label }) => (
            <View key={key} style={styles.macro}>
              <Text style={styles.caption}>{label}</Text>
              <Text style={styles.macroValue}>
                {Math.round(consumed[key])}
                <Text style={styles.caption}> / {goals[key]} g</Text>
              </Text>
              <Meter value={consumed[key]} target={goals[key]} />
            </View>
          ))}
        </View>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Today’s meals
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.addFood}
            onPress={() => setHub(true)}
          >
            <Plus size={16} color={JOURNAL.surface} />
            <Text style={styles.addText}>Add food</Text>
          </TouchableOpacity>
        </View>
        {slots.map((type) => (
          <MealCard
            key={type}
            type={type}
            title={
              type === 'snack'
                ? 'Snacks'
                : type[0].toUpperCase() + type.slice(1)
            }
            entries={grouped[type]}
            onAddPress={add}
            onEditEntry={(entry) => {
              setResult(null);
              setEditing(entry);
              setMeal(true);
            }}
            onDeleteEntry={(id) =>
              void removeMeal(id).catch((e) =>
                showToast('Delete failed', e.message),
              )
            }
          />
        ))}
        <View style={styles.water}>
          <View style={styles.waterLabel}>
            <Droplet size={18} color={JOURNAL.water} />
            <View>
              <Text style={styles.waterTitle}>Water</Text>
              <Text style={styles.caption}>
                {(waterMl / 1000).toFixed(2)} /{' '}
                {((goals.waterMl ?? 2000) / 1000).toFixed(2)} L
              </Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add 250 milliliters of water"
            disabled={waterBusy}
            onPress={() => void addWater()}
            style={styles.waterButton}
          >
            <Text style={styles.waterText}>
              {waterBusy ? 'Saving…' : '+250 ml'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <QuickActionHubModal
        visible={hub}
        onClose={() => setHub(false)}
        onSelectMeal={reuse}
        onSelectAction={(action) => {
          if (action === 'quick_meal') add(slot);
          else if (action === 'scan_food' || action === 'barcode')
            router.push({
              pathname: '/(tabs)/scan',
              params: {
                mode: action === 'barcode' ? 'barcode' : 'food',
                mealType: slot,
              },
            });
          else if (action === 'voice_log') setVoice(true);
          else if (action === 'meal_plan') setPlan(true);
          else setWeight(true);
        }}
      />
      <MealResultModal
        visible={meal}
        editingEntry={editing}
        result={result}
        imageUri={photo}
        defaultMealType={slot}
        nutritionSource={draftSource}
        sourceLabel={
          result
            ? 'Saved meal values · review the portion and nutrition'
            : undefined
        }
        onClose={() => setMeal(false)}
        onDeleteEntry={removeMeal}
        onConfirm={async (item) => {
          if (editing) await editMeal({ ...editing, ...item, id: editing.id });
          else
            await logMeal({
              ...item,
              date: getTodayDateString(),
            });
        }}
      />
      <VoiceLogModal
        visible={voice}
        onClose={() => setVoice(false)}
        defaultMealType={slot}
        onConfirm={async (item, type) => {
          await logMeal({
            name: item.foodName,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            mealType: type,
            portionSize: item.servingSize,
            date: getTodayDateString(),
            source: 'text',
            isAiGenerated: true,
          });
        }}
      />
      <MealPlanModal
        visible={plan}
        onClose={() => setPlan(false)}
        goals={goals}
        currentPreference={dietaryPreference}
        onLogMealItem={async (item) => {
          await logMeal({
            ...item,
            ingredients: undefined,
            date: getTodayDateString(),
            source: 'text',
            isAiGenerated: true,
          });
        }}
      />
      <WeightLogModal
        visible={weight}
        onClose={() => setWeight(false)}
        currentWeightKg={userProfile.weightKg}
        initialUnit={userProfile.unitSystem === 'imperial' ? 'lbs' : 'kg'}
        onSave={addWeight}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: JOURNAL.paper },
  body: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: JOURNAL.line,
  },
  brandGroup: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  brand: { fontFamily: FONTS.serif, fontSize: 24, color: JOURNAL.ink },
  caption: { fontSize: 12, lineHeight: 19, color: JOURNAL.muted },
  date: { fontSize: 12, color: JOURNAL.muted, marginTop: 24, marginBottom: 12 },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 30,
    color: JOURNAL.ink,
    marginBottom: 24,
  },
  summary: {
    backgroundColor: JOURNAL.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
  },
  number: {
    fontSize: 36,
    color: JOURNAL.ink,
    fontVariant: ['tabular-nums'],
    marginTop: 8,
    marginBottom: 16,
  },
  numberUnit: { fontSize: 14, color: JOURNAL.muted },
  track: {
    height: 6,
    backgroundColor: JOURNAL.soft,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: JOURNAL.accent },
  remaining: { fontSize: 14, color: JOURNAL.accentText, marginTop: 12 },
  macros: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  macro: { flex: 1 },
  macroValue: {
    fontSize: 20,
    color: JOURNAL.ink,
    marginTop: 8,
    marginBottom: 12,
    fontVariant: ['tabular-nums'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: FONTS.serif, fontSize: 22, color: JOURNAL.ink },
  addFood: {
    minHeight: 48,
    backgroundColor: JOURNAL.accent,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addText: { fontSize: 14, color: JOURNAL.surface, fontWeight: '600' },
  water: {
    borderTopWidth: 1,
    borderTopColor: JOURNAL.line,
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  waterLabel: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  waterTitle: { fontSize: 16, color: JOURNAL.ink },
  waterButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: JOURNAL.surface,
    borderWidth: 1,
    borderColor: JOURNAL.line,
  },
  waterText: { fontSize: 14, color: JOURNAL.water, fontWeight: '600' },
});
