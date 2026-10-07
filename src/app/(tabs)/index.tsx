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
import Camera from 'lucide-react-native/icons/camera';
import Plus from 'lucide-react-native/icons/plus';
import Droplet from 'lucide-react-native/icons/droplet';
import ChefHat from 'lucide-react-native/icons/chef-hat';
import { JOURNAL, FONTS } from '@/constants/theme';
import { useNutrition } from '@/context/NutritionContext';
import { ScreenHeader, EnergyDial, tempo } from '@/components/Tempo';
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
function Meter({
  value,
  target,
  color,
}: {
  value: number;
  target: number;
  color: string;
}) {
  const fraction = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: target, now: Math.min(target, value) }}
      accessibilityLabel={`${Math.round(value)} of ${target} grams recorded`}
    >
      <View
        style={[
          styles.fill,
          { width: `${fraction * 100}%`, backgroundColor: color },
        ]}
      />
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
    userAccount,
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

  return (
    <SafeAreaView edges={['top']} style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="Today"
          subtitle={date}
          action={
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {userAccount.isLoggedIn
                  ? userAccount.name.charAt(0).toUpperCase() || 'Y'
                  : 'Y'}
              </Text>
            </TouchableOpacity>
          }
        />
        <EnergyDial
          calories={consumed.calories}
          target={goals.calories}
          goalMet={dailySummary.goalMet}
        />
        <View style={styles.macros}>
          {(
            [
              { key: 'protein', label: 'Protein', color: JOURNAL.protein },
              { key: 'carbs', label: 'Carbs', color: JOURNAL.carbs },
              { key: 'fats', label: 'Fat', color: JOURNAL.fats },
            ] as const
          ).map(({ key, label, color }) => (
            <View key={key} style={styles.macro}>
              <Text style={styles.caption}>{label}</Text>
              <Text style={styles.macroValue}>{Math.round(consumed[key])}</Text>
              <Text style={styles.macroTarget}>/ {goals[key]} g</Text>
              <Meter value={consumed[key]} target={goals[key]} color={color} />
            </View>
          ))}
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[tempo.primary, { flex: 1 }]}
            onPress={() => setHub(true)}
          >
            <Plus size={18} color={JOURNAL.ink} />
            <Text style={tempo.primaryText}>Log a meal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Take a food photo"
            style={[tempo.secondary, { width: 52, paddingHorizontal: 0 }]}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/scan',
                params: { mode: 'food', mealType: slot },
              })
            }
          >
            <Camera size={22} color={JOURNAL.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={tempo.sectionTitle}>
            Meal log
          </Text>
          <Text style={styles.caption}>
            {dailySummary.entries.length}{' '}
            {dailySummary.entries.length === 1 ? 'entry' : 'entries'}
          </Text>
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
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setPlan(true)}
          style={styles.ideas}
        >
          <ChefHat size={18} color={JOURNAL.accent} />
          <Text style={styles.waterText}>Meal ideas for your day</Text>
        </TouchableOpacity>
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
        onLogMealItem={async (item, isAiGenerated) => {
          await logMeal({
            ...item,
            ingredients: undefined,
            date: getTodayDateString(),
            source: isAiGenerated ? 'text' : 'manual',
            isAiGenerated,
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
  page: tempo.page,
  body: tempo.body,
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: JOURNAL.lime,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontFamily: FONTS.bold, fontSize: 20, color: JOURNAL.ink },
  caption: tempo.caption,
  macros: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  macro: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: JOURNAL.surface,
    borderWidth: 1,
    borderColor: JOURNAL.line,
  },
  macroValue: {
    fontFamily: FONTS.bold,
    fontSize: 23,
    color: JOURNAL.ink,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  macroTarget: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: JOURNAL.muted,
    marginTop: 2,
    marginBottom: 10,
  },
  track: {
    height: 4,
    backgroundColor: JOURNAL.soft,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  sectionHeader: { ...tempo.between, marginBottom: 8 },
  water: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: JOURNAL.soft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
  },
  waterLabel: { flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 },
  waterTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: JOURNAL.accent,
  },
  waterButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: JOURNAL.surface,
  },
  waterText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: JOURNAL.accent,
  },
  ideas: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
});
