import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { useNutrition } from '@/context/NutritionContext';
import { WeightLogModal } from '@/components/WeightLogModal';
import { MilestoneBadges } from '@/components/MilestoneBadges';
import { calculateNutritionPlan, kgToLbs } from '@/services/tdeeCalculator';
import { weightProgress } from '@/services/nutritionRules';
import {
  trailingDates,
  summarizePeriod,
  weightChart,
} from '@/services/analyticsRules';
import { recordedWeightsThrough } from '@/services/journalRules';
import { getTodayDateString } from '@/services/storage';
import { JOURNAL, FONTS } from '@/constants/theme';
export default function AnalyticsScreen() {
  const {
    stats,
    goals,
    userProfile,
    weightLogs,
    milestoneBadges,
    entries,
    addWeight,
    deleteWeight,
    showToast,
  } = useNutrition();
  const [range, setRange] = useState(30),
    [unitOverride, setUnit] = useState<'kg' | 'lbs' | null>(null),
    [modal, setModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const confirmDelete = async (id: string) => {
    if (deletingBusy) return;
    setDeletingBusy(true);
    try {
      await deleteWeight(id);
      setDeletingId(null);
    } catch (error) {
      showToast(
        'Delete failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setDeletingBusy(false);
    }
  };
  const imperial =
      (unitOverride ??
        (userProfile.unitSystem === 'imperial' ? 'lbs' : 'kg')) === 'lbs',
    unit = imperial ? 'lbs' : 'kg';
  const today = getTodayDateString();
  const dates = useMemo(() => {
    const earliest = entries.reduce(
      (first, e) => (e.date < first ? e.date : first),
      today,
    );
    const count =
      range ||
      Math.max(
        1,
        Math.round(
          (Date.parse(`${today}T12:00:00Z`) -
            Date.parse(`${earliest}T12:00:00Z`)) /
            86400000,
        ) + 1,
      );
    return trailingDates(today, count);
  }, [entries, today, range]);
  const summary = useMemo(
    () => summarizePeriod(entries, dates, goals),
    [entries, dates, goals],
  );
  const recorded = useMemo(
    () => recordedWeightsThrough(weightLogs, today),
    [weightLogs, today],
  );
  const logs = useMemo(
    () => recorded.filter((w) => !range || w.date >= dates[0]),
    [recorded, range, dates],
  );
  const displayLogs = useMemo(() => logs.slice().reverse(), [logs]);
  const current = recorded.at(-1)?.weightKg ?? userProfile.weightKg,
    start = recorded[0]?.weightKg ?? current;
  const progress = weightProgress(start, current, userProfile.targetWeightKg);
  const format = (kg: number) =>
    imperial ? kgToLbs(kg) : Math.round(kg * 10) / 10;
  const width = 320,
    height = 160;
  const chart = useMemo(
    () =>
      weightChart(logs, userProfile.targetWeightKg, width, height, imperial),
    [logs, userProfile.targetWeightKg, imperial],
  );
  const plan = useMemo(
    () => calculateNutritionPlan({ ...userProfile, weightKg: current }),
    [userProfile, current],
  );
  const balance = goals.calories - plan.tdee;
  const header = (
    <>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Your progress
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.button}
          onPress={() => setModal(true)}
        >
          <Text style={styles.buttonText}>Log weight</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.text}>Small habits, recorded over time.</Text>
      <View style={styles.filters}>
        {[30, 60, 90, 180, 365, 0].map((n) => (
          <TouchableOpacity
            key={n}
            accessibilityRole="button"
            accessibilityState={{ selected: range === n }}
            onPress={() => setRange(n)}
            style={[styles.pill, range === n && styles.active]}
          >
            <Text style={styles.buttonText}>{n === 0 ? 'All' : `${n}D`}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>Weight history</Text>
          <View style={styles.units}>
            {(['kg', 'lbs'] as const).map((u) => (
              <TouchableOpacity
                key={u}
                accessibilityRole="button"
                accessibilityState={{ selected: unit === u }}
                style={[styles.pill, unit === u && styles.active]}
                onPress={() => setUnit(u)}
              >
                <Text style={styles.buttonText}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Text style={styles.number}>
          {recorded.length ? format(current) : '—'}{' '}
          <Text style={styles.text}>{unit}</Text>
        </Text>
        <Text style={styles.text}>
          Target {format(userProfile.targetWeightKg)} {unit} ·{' '}
          {Math.round(progress * 100)}% toward target
        </Text>
        {chart.points.length ? (
          <>
            <Svg
              width="100%"
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              accessibilityLabel={`Weight history with ${logs.length} entries. Goal ${format(userProfile.targetWeightKg)} ${unit}.`}
            >
              <Line
                x1={20}
                x2={width - 20}
                y1={chart.goalY}
                y2={chart.goalY}
                stroke={JOURNAL.muted}
                strokeDasharray="5 4"
              />
              <Polyline
                points={chart.points.map((p) => `${p.x},${p.y}`).join(' ')}
                stroke={JOURNAL.accent}
                strokeWidth={3}
                fill="none"
              />
              {chart.points.map((p) => (
                <Circle
                  key={p.log.id}
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  fill={JOURNAL.accent}
                />
              ))}
            </Svg>
            <View style={styles.header}>
              <Text style={styles.caption}>{logs[0].date}</Text>
              <Text style={styles.caption}>{logs.at(-1)?.date}</Text>
            </View>
            <Text style={styles.caption}>
              Dashed line: target. Horizontal spacing represents elapsed time.
            </Text>
          </>
        ) : (
          <Text style={styles.text}>No weigh-ins in this period.</Text>
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.subtitle}>Recorded nutrition</Text>
        <Text style={styles.number}>
          {summary.averageCalories} <Text style={styles.text}>kcal/day</Text>
        </Text>
        <Text style={styles.text}>
          {summary.loggedDays}/{dates.length} days logged. Averages include days
          without records as zero.
        </Text>
        <Text style={styles.text}>
          {summary.adherence}% of days within 90–110% of your calorie target
        </Text>
        <Text style={styles.caption}>
          Current streak {stats.currentStreak} days · Best {stats.bestStreak}{' '}
          days
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.subtitle}>Energy estimate</Text>
        <Text style={styles.text}>Estimated BMR: {plan.bmr} kcal/day</Text>
        <Text style={styles.text}>
          Estimated daily expenditure: {plan.tdee} kcal/day
        </Text>
        <Text style={styles.text}>
          Your target: {goals.calories} kcal/day ({balance >= 0 ? '+' : ''}
          {balance} relative to estimated expenditure)
        </Text>
        <Text style={styles.caption}>
          Based on your profile. These estimates do not predict a date for
          reaching your weight goal.
        </Text>
      </View>
      <MilestoneBadges badges={milestoneBadges} />
      <Text
        accessibilityRole="header"
        style={[styles.subtitle, { marginVertical: 20 }]}
      >
        Your weigh-ins
      </Text>
    </>
  );
  return (
    <SafeAreaView edges={['top']} style={styles.page}>
      <FlatList
        data={displayLogs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.body}
        ListHeaderComponent={header}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        ListEmptyComponent={
          <Text style={styles.text}>
            Your recorded weights will appear here.
          </Text>
        }
        extraData={deletingId}
        renderItem={({ item }) => (
          <View style={{ borderTopWidth: 1, borderTopColor: JOURNAL.line }}>
            <View style={[styles.weighIn, { borderTopWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.record}>
                  {item.date} · {format(item.weightKg)} {unit}
                </Text>
                {item.note ? (
                  <Text style={styles.text}>{item.note}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Delete weigh-in for ${item.date}`}
                disabled={deletingBusy}
                style={styles.button}
                onPress={() => setDeletingId(item.id)}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
            {deletingId === item.id ? (
              <View style={{ paddingBottom: 16 }}>
                <Text style={styles.text}>
                  Delete this weigh-in from your records?
                </Text>
                <View style={styles.units}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={deletingBusy}
                    style={styles.button}
                    onPress={() => setDeletingId(null)}
                  >
                    <Text style={styles.buttonText}>Keep record</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={deletingBusy}
                    style={styles.button}
                    onPress={() => void confirmDelete(item.id)}
                  >
                    <Text style={[styles.buttonText, { color: JOURNAL.error }]}>
                      {deletingBusy ? 'Deleting…' : 'Delete record'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        )}
      />
      <WeightLogModal
        visible={modal}
        onClose={() => setModal(false)}
        currentWeightKg={current}
        initialUnit={unit}
        onSave={addWeight}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: JOURNAL.paper },
  body: { padding: 24, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 30,
    color: JOURNAL.ink,
    flexShrink: 1,
  },
  subtitle: { fontFamily: FONTS.serif, fontSize: 22, color: JOURNAL.ink },
  filters: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginVertical: 24,
  },
  units: { flexDirection: 'row', gap: 8 },
  button: {
    minHeight: 48,
    minWidth: 48,
    padding: 12,
    justifyContent: 'center',
    backgroundColor: JOURNAL.soft,
    borderRadius: 12,
  },
  buttonText: { fontSize: 14, color: JOURNAL.ink },
  pill: {
    minHeight: 48,
    padding: 12,
    justifyContent: 'center',
    backgroundColor: JOURNAL.surface,
    borderRadius: 12,
  },
  active: {
    backgroundColor: JOURNAL.soft,
    borderWidth: 1,
    borderColor: JOURNAL.line,
  },
  card: {
    backgroundColor: JOURNAL.surface,
    padding: 20,
    borderRadius: 18,
    marginBottom: 16,
  },
  number: {
    fontSize: 30,
    fontWeight: '500',
    color: JOURNAL.ink,
    marginVertical: 12,
    fontVariant: ['tabular-nums'],
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: JOURNAL.muted,
    marginVertical: 4,
  },
  caption: { fontSize: 12, lineHeight: 20, color: JOURNAL.muted, marginTop: 8 },
  weighIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: JOURNAL.line,
  },
  record: { fontSize: 16, color: JOURNAL.ink },
});
