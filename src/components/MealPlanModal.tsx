import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type {
  AiMealPlan,
  AiMealPlanItem,
  DietaryPreference,
  MacroTargets,
} from '@/types/nutrition';
import { generateDailyMealPlan } from '@/services/mealPlanService';
import { useNutrition } from '@/context/NutritionContext';
import { PALETTE, FONTS, JOURNAL } from '@/constants/theme';
interface Props {
  visible: boolean;
  onClose: () => void;
  goals: MacroTargets;
  currentPreference: DietaryPreference;
  onLogMealItem: (item: AiMealPlanItem) => void | Promise<void>;
}
const preferences: DietaryPreference[] = [
  'balanced',
  'high_protein',
  'keto',
  'vegan',
  'vegetarian',
  'mediterranean',
  'paleo',
  'intermittent_fasting',
];
function Content({
  onClose,
  goals,
  currentPreference,
  onLogMealItem,
}: Omit<Props, 'visible'>) {
  const { setDietaryPreference } = useNutrition();
  const [preference, setPreference] = useState(currentPreference),
    [plan, setPlan] = useState<AiMealPlan | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [saving, setSaving] = useState<string | null>(null),
    [logged, setLogged] = useState<string[]>([]);
  const { calories, protein, carbs, fats, waterMl } = goals;
  const targets = useMemo(
    () => ({ calories, protein, carbs, fats, waterMl }),
    [calories, protein, carbs, fats, waterMl],
  );
  const requestId = useRef(0);
  useEffect(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    void generateDailyMealPlan(targets, preference, controller.signal)
      .then((p) => {
        if (id === requestId.current) setPlan(p);
      })
      .catch((e) => {
        if (!controller.signal.aborted && id === requestId.current)
          setError(
            e instanceof Error ? e.message : 'Unable to prepare meal ideas.',
          );
      })
      .finally(() => {
        if (id === requestId.current) setBusy(false);
      });
    return () => {
      controller.abort();
    };
  }, [targets, preference, revision]);
  const select = async (p: DietaryPreference) => {
    try {
      await setDietaryPreference(p);
      setBusy(true);
      setError('');
      setPlan(null);
      setLogged([]);
      setPreference(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save preference.');
    }
  };
  const log = async (meal: AiMealPlanItem) => {
    if (saving || logged.includes(meal.mealType)) return;
    setSaving(meal.mealType);
    setError('');
    try {
      await onLogMealItem(meal);
      setLogged((list) => [...list, meal.mealType]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setSaving(null);
    }
  };
  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Meal ideas</Text>
          <TouchableOpacity
            style={styles.close}
            accessibilityRole="button"
            onPress={onClose}
          >
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.note}>
          Estimated portions for your {goals.calories} kcal target. Log a meal
          after you eat it.
        </Text>
        <ScrollView horizontal style={styles.filters}>
          {preferences.map((p) => (
            <TouchableOpacity
              key={p}
              accessibilityRole="button"
              accessibilityState={{ selected: p === preference }}
              onPress={() => select(p)}
              style={[styles.pill, p === preference && styles.active]}
            >
              <Text>{p.replaceAll('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {busy ? (
          <ActivityIndicator
            accessibilityLabel="Preparing meal ideas"
            style={{ margin: 24 }}
          />
        ) : (
          <ScrollView>
            {plan?.meals.map((meal) => (
              <View style={styles.card} key={meal.mealType}>
                <Text style={styles.slot}>{meal.mealType.toUpperCase()}</Text>
                <Text style={styles.title}>{meal.name}</Text>
                <Text style={styles.note}>
                  {meal.portionSize} · {meal.calories} kcal
                </Text>
                <Text>
                  P {meal.protein}g · C {meal.carbs}g · F {meal.fats}g
                </Text>
                <Text style={styles.note}>{meal.ingredients.join('\n')}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => log(meal)}
                  disabled={!!saving || logged.includes(meal.mealType)}
                  style={styles.primary}
                >
                  {saving === meal.mealType ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.primaryText}>
                      {logged.includes(meal.mealType)
                        ? 'Eaten meal logged'
                        : 'I ate this — log meal'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.close}
          disabled={busy || !!saving}
          onPress={() => {
            setBusy(true);
            setError('');
            setPlan(null);
            setLogged([]);
            setRevision((r) => r + 1);
          }}
        >
          <Text>Generate new ideas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
export function MealPlanModal(props: Props) {
  if (!props.visible) return null;
  return (
    <Modal transparent animationType="none" onRequestClose={props.onClose}>
      <Content {...props} />
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: JOURNAL.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: PALETTE.white,
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: FONTS.serif, fontSize: 21, color: PALETTE[950] },
  note: {
    fontSize: 14,
    lineHeight: 21,
    color: PALETTE[600],
    marginVertical: 12,
  },
  filters: { flexGrow: 0, marginBottom: 12 },
  pill: {
    minHeight: 44,
    padding: 12,
    borderRadius: 12,
    backgroundColor: PALETTE[50],
    marginRight: 6,
  },
  active: { backgroundColor: PALETTE[200] },
  card: {
    padding: 18,
    backgroundColor: PALETTE[50],
    borderRadius: 18,
    marginVertical: 8,
  },
  slot: { fontSize: 13, color: PALETTE[600], marginBottom: 8 },
  close: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  primary: {
    minHeight: 48,
    backgroundColor: PALETTE[900],
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  primaryText: { fontSize: 16, color: 'white' },
  error: { color: JOURNAL.error, fontSize: 14, lineHeight: 20 },
});
