import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { useNutrition } from '@/context/NutritionContext';
import { WeightLogModal } from '@/components/WeightLogModal';
import Plus from 'lucide-react-native/icons/plus';
import Flame from 'lucide-react-native/icons/flame';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { ScreenHeader, tempo } from '@/components/Tempo';
import { MetricValue } from '@/components/MetricValue';
import { MilestoneBadges } from '@/components/MilestoneBadges';
import { calculateNutritionPlan, kgToLbs } from '@/services/tdeeCalculator';
import { weightProgress } from '@/services/nutritionRules';
import {
  analyticsDates,
  summarizePeriod,
  weightChart,
} from '@/services/analyticsRules';
import { recordedWeightsThrough } from '@/services/journalRules';
import { getTodayDateString } from '@/services/storage';
import { JOURNAL, FONTS } from '@/constants/theme';
export default function AnalyticsScreen() {
  const { fontScale, width: windowWidth } = useWindowDimensions();
  const stackSummary = fontScale > 1.3 || windowWidth < 350;
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
  const [energyOpen, setEnergyOpen] = useState(false);
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
  const dates = useMemo(
    () => analyticsDates(entries, weightLogs, today, range),
    [entries, weightLogs, today, range],
  );
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
      <ScreenHeader
        title="Progress"
        subtitle="Small changes. A clearer trend."
        action={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Log weight"
            style={tempo.iconButton}
            onPress={() => setModal(true)}
          >
            <Plus size={22} color={JOURNAL.ink} />
          </TouchableOpacity>
        }
      />
      <View style={styles.filters}>
        {[30, 60, 90, 180, 365, 0].map((n) => (
          <TouchableOpacity
            key={n}
            accessibilityRole="button"
            accessibilityState={{ selected: range === n }}
            onPress={() => setRange(n)}
            style={[styles.pill, range === n && styles.active]}
          >
            <Text style={styles.buttonText}>
              {n === 0 ? 'All' : n === 365 ? '1Y' : `${n}D`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.weightCard}>
        <View style={tempo.between}>
          <Text style={styles.darkCaption}>RECORDED WEIGHT</Text>
          <Text style={styles.change}>
            {recorded.length > 1
              ? `${current - start > 0 ? '↑' : current - start < 0 ? '↓' : '↔'} ${format(Math.abs(current - start))} ${unit}`
              : 'First steps'}
          </Text>
        </View>
        <MetricValue
          value={recorded.length ? format(current) : '—'}
          unit={unit}
          valueStyle={styles.weightNumber}
          unitStyle={styles.darkCaption}
          style={{ marginTop: 20, marginBottom: 4 }}
        />
        <Text style={styles.darkCaption}>
          {range ? `${range} day view` : 'All records'} · {format(start)} →{' '}
          {format(userProfile.targetWeightKg)} {unit} start / goal
        </Text>
        <View style={styles.chart}>
          {chart.points.length ? (
            <>
              <Svg
                width="100%"
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                accessible
                accessibilityLabel={`Weight history with ${logs.length} entries. Starting ${format(logs[0].weightKg)}, latest ${format(logs.at(-1)!.weightKg)} ${unit}. Goal ${format(userProfile.targetWeightKg)} ${unit}.`}
              >
                {[40, 80, 120].map((y) => (
                  <Line
                    key={y}
                    x1={20}
                    x2={width - 20}
                    y1={y}
                    y2={y}
                    stroke={JOURNAL.darkTrack}
                  />
                ))}
                <Line
                  x1={20}
                  x2={width - 20}
                  y1={chart.goalY}
                  y2={chart.goalY}
                  stroke={JOURNAL.onDark}
                  strokeDasharray="5 4"
                />
                <Polyline
                  points={chart.points.map((p) => `${p.x},${p.y}`).join(' ')}
                  stroke={JOURNAL.lime}
                  strokeWidth={3}
                  fill="none"
                />
                {chart.points.map((p) => (
                  <Circle
                    key={p.log.id}
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill={JOURNAL.lime}
                  />
                ))}
              </Svg>
              <View style={tempo.between}>
                <Text style={styles.darkCaption}>{logs[0].date}</Text>
                <Text style={styles.darkCaption}>{logs.at(-1)?.date}</Text>
              </View>
            </>
          ) : (
            <Text
              style={[
                styles.darkCaption,
                { textAlign: 'center', paddingVertical: 48 },
              ]}
            >
              No weigh-ins in this period. Log one to begin.
            </Text>
          )}
        </View>
        <View style={tempo.between}>
          <Text style={styles.darkCaption}>
            Dashed goal: {format(userProfile.targetWeightKg)} {unit}
          </Text>
          <View style={styles.units}>
            {(['kg', 'lbs'] as const).map((u) => (
              <TouchableOpacity
                key={u}
                accessibilityRole="button"
                accessibilityLabel={`Show weight in ${u}`}
                accessibilityState={{ selected: unit === u }}
                style={[
                  styles.unitPill,
                  unit === u && { backgroundColor: JOURNAL.darkTrack },
                ]}
                onPress={() => setUnit(u)}
              >
                <Text
                  style={[
                    styles.darkCaption,
                    unit === u && { color: JOURNAL.lime },
                  ]}
                >
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Text style={styles.darkCaption}>
          {Math.round(progress * 100)}% toward goal · dates are spaced by
          elapsed time.
        </Text>
      </View>
      <View
        style={[
          styles.nutritionCards,
          stackSummary && { flexDirection: 'column' },
        ]}
      >
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.caption}>Recorded average</Text>
          <MetricValue
            value={summary.averageCalories.toLocaleString()}
            unit="kcal"
            valueStyle={styles.statNumber}
            unitStyle={styles.caption}
            style={{ marginVertical: 8 }}
          />
          <Text style={styles.caption}>
            {summary.loggedDays} / {dates.length} days logged. Unlogged days
            count as zero records.
          </Text>
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.caption}>Within target</Text>
          <MetricValue
            value={summary.adherence}
            unit="% of days"
            valueStyle={styles.statNumber}
            unitStyle={styles.caption}
            style={{ marginVertical: 8 }}
          />
          <Text style={styles.caption}>
            Days within 90–110% of your calorie target.
          </Text>
        </View>
      </View>
      <View style={styles.streak}>
        <Flame size={22} color={JOURNAL.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.record}>
            {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}{' '}
            logging streak
          </Text>
          <Text style={styles.caption}>
            Your best: {stats.bestStreak}{' '}
            {stats.bestStreak === 1 ? 'day' : 'days'}
          </Text>
        </View>
      </View>
      <View style={styles.card}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ expanded: energyOpen }}
          style={tempo.between}
          onPress={() => setEnergyOpen(!energyOpen)}
        >
          <Text style={styles.subtitle}>Energy estimate</Text>
          {energyOpen ? (
            <ChevronUp size={20} color={JOURNAL.muted} />
          ) : (
            <ChevronDown size={20} color={JOURNAL.muted} />
          )}
        </TouchableOpacity>
        {energyOpen && (
          <View>
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
        )}
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
  page: tempo.page,
  body: tempo.body,
  header: tempo.between,
  subtitle: tempo.sectionTitle,
  text: { ...tempo.text, marginVertical: 8 },
  caption: { ...tempo.caption, fontSize: 11 },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    backgroundColor: JOURNAL.soft,
    padding: 4,
    borderRadius: 16,
    marginBottom: 20,
  },
  pill: {
    flex: 1,
    minWidth: 42,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 12,
  },
  active: { backgroundColor: JOURNAL.surface },
  button: {
    minHeight: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: JOURNAL.soft,
  },
  buttonText: { fontFamily: FONTS.semibold, fontSize: 11, color: JOURNAL.ink },
  units: { flexDirection: 'row', gap: 4 },
  unitPill: {
    minHeight: 48,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  weightCard: { ...tempo.darkCard, padding: 20 },
  darkCaption: { ...tempo.darkCaption, fontSize: 11 },
  change: tempo.darkTag,
  weightNumber: {
    fontFamily: FONTS.bold,
    fontSize: 52,
    lineHeight: 70,
    letterSpacing: -2,
    color: JOURNAL.surface,
  },
  chart: { marginTop: 24, marginBottom: 8 },
  nutritionCards: { flexDirection: 'row', gap: 10 },
  card: { ...tempo.card, padding: 16 },
  statNumber: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    lineHeight: 36,
    color: JOURNAL.ink,
    letterSpacing: -1,
  },
  streak: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: JOURNAL.soft,
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
  },
  weighIn: {
    borderTopWidth: 1,
    borderTopColor: JOURNAL.line,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  record: { fontFamily: FONTS.semibold, fontSize: 14, color: JOURNAL.ink },
});
