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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type {
  AiMealPlan,
  AiMealPlanItem,
  DietaryPreference,
  MacroTargets,
} from '@/types/nutrition';
import { generateDailyMealPlan } from '@/services/mealPlanService';
import {
  everydayMealPlan,
  mealPlanTotals,
} from '@/services/localMealPlanService';
import { readMealPlanCache, saveMealPlanCache } from '@/services/mealPlanCache';
import { mealIdeaError } from '@/services/nutritionApi';
import { useNutrition } from '@/context/NutritionContext';
import { FONTS, JOURNAL } from '@/constants/theme';
interface Props {
  visible: boolean;
  onClose: () => void;
  goals: MacroTargets;
  currentPreference: DietaryPreference;
  onLogMealItem: (
    item: AiMealPlanItem,
    isAiGenerated: boolean,
  ) => void | Promise<void>;
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
type PlanSource = 'local' | 'ai' | 'cached';
function Content({
  onClose,
  goals,
  currentPreference,
  onLogMealItem,
}: Omit<Props, 'visible'>) {
  const { setDietaryPreference, userAccount } = useNutrition();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const owner = userAccount.isLoggedIn ? userAccount.id : 'guest';
  const [preference, setPreference] = useState(currentPreference);
  const [revision, setRevision] = useState(0);
  const [personalized, setPersonalized] = useState<{
    plan: AiMealPlan;
    key: string;
    source: PlanSource;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [logged, setLogged] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const selecting = useRef(false);
  const logging = useRef(false);
  const active = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const mounted = useRef(true);
  const { calories, protein, carbs, fats } = goals;
  const targets = useMemo(
    () => ({ calories, protein, carbs, fats }),
    [calories, protein, carbs, fats],
  );
  const contextKey = JSON.stringify([
    owner,
    calories,
    protein,
    carbs,
    fats,
    preference,
  ]);
  const latestKey = useRef(contextKey);
  const local = useMemo(
    () => everydayMealPlan(targets, preference, revision),
    [targets, preference, revision],
  );
  const selected = personalized?.key === contextKey ? personalized : null;
  const plan = selected?.plan ?? local;
  const source = selected?.source ?? 'local';
  const totals = useMemo(() => mealPlanTotals(plan), [plan]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const id = ++epoch.current;
    latestKey.current = contextKey;
    active.current?.abort();
    active.current = null;
    void readMealPlanCache(owner, targets, preference)
      .then((cached) => {
        if (
          cached &&
          !cancelled &&
          mounted.current &&
          id === epoch.current &&
          latestKey.current === contextKey
        ) {
          setPersonalized({ plan: cached, key: contextKey, source: 'cached' });
        }
      })
      .catch(() => {
        /* Storage unavailable: keep the instant everyday plan. */
      });
    return () => {
      cancelled = true;
    };
  }, [owner, targets, preference, contextKey]);
  const personalize = async () => {
    if (active.current || logging.current || selecting.current) return;
    if (owner === 'guest') {
      onClose();
      router.push('/(tabs)/profile');
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    const id = ++epoch.current;
    const key = contextKey;
    const current = () =>
      mounted.current &&
      !controller.signal.aborted &&
      id === epoch.current &&
      key === latestKey.current;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await generateDailyMealPlan(
        targets,
        preference,
        controller.signal,
        owner,
      );
      if (!current()) return;
      setPersonalized({ plan: result, key, source: 'ai' });
      try {
        await saveMealPlanCache(owner, targets, preference, result);
        if (current()) setNotice('Saved on this device for today.');
      } catch {
        if (current())
          setNotice(
            'Ready to use. This device could not save the ideas for later.',
          );
      }
    } catch (e) {
      if (current()) setError(mealIdeaError(e));
    } finally {
      if (active.current === controller) {
        active.current = null;
        if (mounted.current) setBusy(false);
      }
    }
  };
  const cancel = () => {
    epoch.current++;
    active.current?.abort();
    active.current = null;
    setBusy(false);
  };
  const select = async (value: DietaryPreference) => {
    if (value === preference || selecting.current || logging.current) return;
    selecting.current = true;
    setChoosing(true);
    cancel();
    setError('');
    setNotice('');
    try {
      await setDietaryPreference(value);
      if (mounted.current) {
        setPreference(value);
        setRevision(0);
        setPersonalized(null);
      }
    } catch {
      if (mounted.current)
        setError(
          'Could not save this preference. Your previous selection is still active.',
        );
    } finally {
      selecting.current = false;
      if (mounted.current) setChoosing(false);
    }
  };
  const log = async (meal: AiMealPlanItem, itemKey: string) => {
    if (
      logging.current ||
      active.current ||
      selecting.current ||
      logged.includes(itemKey)
    )
      return;
    logging.current = true;
    setSaving(itemKey);
    setError('');
    try {
      await onLogMealItem(meal, source !== 'local');
      if (mounted.current) setLogged((list) => [...list, itemKey]);
    } catch {
      if (mounted.current)
        setError('The meal was not saved. Please try again.');
    } finally {
      logging.current = false;
      if (mounted.current) setSaving(null);
    }
  };
  const disabled = !!saving || choosing;
  return (
    <View style={[styles.overlay, { paddingTop: insets.top + 16 }]}>
      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          { paddingBottom: Math.max(16, insets.bottom), maxHeight: '100%' },
        ]}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Meal ideas
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onClose}
            style={styles.close}
          >
            <Text style={styles.text}>Close</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
        >
          <Text style={styles.note}>
            Review the portion and log a meal after you eat it.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filters}
          >
            {preferences.map((value) => (
              <TouchableOpacity
                key={value}
                accessibilityRole="button"
                accessibilityState={{
                  selected: value === preference,
                  disabled,
                }}
                disabled={disabled}
                onPress={() => void select(value)}
                style={[
                  styles.pill,
                  value === preference && styles.active,
                  disabled && styles.disabled,
                ]}
              >
                <Text style={styles.text}>{value.replaceAll('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.summary}>
            <Text style={styles.slot}>
              {source === 'local'
                ? 'EVERYDAY IDEAS · AVAILABLE OFFLINE'
                : source === 'cached'
                  ? 'SAVED AI IDEAS · FROM TODAY'
                  : 'PERSONALIZED AI IDEAS'}
            </Text>
            <Text style={styles.total}>
              {totals.calories.toLocaleString()} kcal suggested
            </Text>
            <Text style={styles.note}>
              Your daily target: {calories.toLocaleString()} kcal
              {Math.abs(totals.calories - calories) > calories * 0.1
                ? '. These portions do not cover your full target exactly.'
                : '.'}
            </Text>
            <Text style={styles.text}>
              P {totals.protein} g · C {totals.carbs} g · F {totals.fats} g
            </Text>
            <Text style={styles.note}>
              Estimated nutrition. Check portions, ingredients and allergens.{' '}
              {preference === 'intermittent_fasting'
                ? 'Choose your own meal timing; no fasting schedule is prescribed.'
                : ''}
            </Text>
          </View>
          <View style={styles.aiPanel}>
            <Text style={styles.panelTitle}>Optional AI ideas</Text>
            <Text style={styles.panelNote}>
              {owner === 'guest'
                ? 'Sign in for alternatives to your everyday ideas.'
                : 'Try alternatives for your targets and preference.'}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || disabled }}
              disabled={busy || disabled}
              onPress={() => void personalize()}
              style={[styles.primary, (busy || disabled) && styles.disabled]}
            >
              {busy ? (
                <ActivityIndicator
                  accessibilityLabel="Personalizing meal ideas"
                  color={JOURNAL.ink}
                />
              ) : (
                <Text style={styles.primaryText}>
                  {owner === 'guest'
                    ? 'Sign in for AI ideas'
                    : source === 'local'
                      ? 'Personalize with AI'
                      : 'Refresh AI ideas'}
                </Text>
              )}
            </TouchableOpacity>
            {busy ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={cancel}
                style={styles.close}
              >
                <Text style={styles.panelNote}>Cancel personalization</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.panelNote}>
              Uses your targets and dietary preference only.
            </Text>
          </View>
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          {notice ? (
            <Text accessibilityLiveRegion="polite" style={styles.note}>
              {notice}
            </Text>
          ) : null}
          {plan.meals.map((meal) => {
            const itemKey = `${plan.id}-${meal.mealType}`;
            const open = expanded.includes(itemKey);
            const done = logged.includes(itemKey);
            return (
              <View style={styles.card} key={itemKey}>
                <Text style={styles.slot}>{meal.mealType.toUpperCase()}</Text>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.note}>
                  {meal.calories} kcal · P {meal.protein} g · C {meal.carbs} g ·
                  F {meal.fats} g
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${open ? 'Hide' : 'Review'} ${meal.name} portion and ingredients`}
                  accessibilityState={{ expanded: open }}
                  style={styles.close}
                  onPress={() =>
                    setExpanded((list) =>
                      open
                        ? list.filter((key) => key !== itemKey)
                        : [...list, itemKey],
                    )
                  }
                >
                  <Text style={styles.link}>
                    {open ? 'Hide details' : 'Review portion & ingredients'}
                  </Text>
                </TouchableOpacity>
                {open ? (
                  <>
                    <Text style={styles.text}>{meal.portionSize}</Text>
                    <Text style={styles.note}>
                      {meal.ingredients.join('\n')}
                    </Text>
                    {meal.description ? (
                      <Text style={styles.note}>{meal.description}</Text>
                    ) : null}
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: disabled || busy || done,
                      }}
                      disabled={disabled || busy || done}
                      onPress={() => void log(meal, itemKey)}
                      style={[
                        styles.primary,
                        (disabled || busy || done) && styles.disabled,
                      ]}
                    >
                      {saving === itemKey ? (
                        <ActivityIndicator
                          accessibilityLabel="Saving meal"
                          color={JOURNAL.ink}
                        />
                      ) : (
                        <Text style={styles.primaryText}>
                          {done ? 'Eaten meal logged' : 'I ate this — log meal'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            );
          })}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={disabled || busy}
            accessibilityState={{ disabled: disabled || busy }}
            style={[styles.secondary, (disabled || busy) && styles.disabled]}
            onPress={() => {
              epoch.current++;
              setPersonalized(null);
              setError('');
              setNotice('');
              setRevision((value) => value + 1);
            }}
          >
            <Text style={styles.link}>
              {source === 'local'
                ? 'Other everyday ideas'
                : 'Use everyday ideas'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}
export function MealPlanModal(props: Props) {
  if (!props.visible) return null;
  return (
    <Modal transparent animationType="none" onRequestClose={props.onClose}>
      <Content
        key={`${props.goals.calories}-${props.goals.protein}-${props.goals.carbs}-${props.goals.fats}`}
        {...props}
      />
    </Modal>
  );
}
const styles = StyleSheet.create({
  text: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 22,
    color: JOURNAL.ink,
  },
  overlay: {
    flex: 1,
    backgroundColor: JOURNAL.scrim,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: JOURNAL.surface,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 8,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    lineHeight: 36,
    color: JOURNAL.ink,
    flexShrink: 1,
  },
  body: { paddingBottom: 16 },
  note: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 22,
    color: JOURNAL.muted,
    marginVertical: 8,
  },
  filters: { flexGrow: 0, marginVertical: 8 },
  pill: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: JOURNAL.paper,
    marginRight: 8,
  },
  active: { backgroundColor: JOURNAL.lime },
  aiPanel: {
    backgroundColor: JOURNAL.ink,
    borderRadius: 20,
    padding: 20,
    marginVertical: 12,
  },
  panelTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    lineHeight: 28,
    color: JOURNAL.surface,
  },
  panelNote: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 22,
    color: JOURNAL.onDark,
    marginVertical: 8,
  },
  summary: { paddingVertical: 16 },
  total: {
    fontFamily: FONTS.bold,
    fontSize: 23,
    lineHeight: 34,
    color: JOURNAL.ink,
  },
  mealName: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    lineHeight: 28,
    color: JOURNAL.ink,
  },
  card: {
    padding: 20,
    backgroundColor: JOURNAL.paper,
    borderRadius: 20,
    marginVertical: 8,
  },
  slot: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    lineHeight: 20,
    color: JOURNAL.accentText,
    marginBottom: 8,
  },
  close: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  primary: {
    minHeight: 48,
    backgroundColor: JOURNAL.lime,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 12,
  },
  primaryText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    lineHeight: 24,
    color: JOURNAL.ink,
    textAlign: 'center',
  },
  link: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    lineHeight: 22,
    color: JOURNAL.accentText,
  },
  secondary: {
    minHeight: 48,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabled: { opacity: 0.55 },
  error: {
    fontFamily: FONTS.sans,
    color: JOURNAL.error,
    fontSize: 14,
    lineHeight: 22,
    marginVertical: 12,
  },
});
