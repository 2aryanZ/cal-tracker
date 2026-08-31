import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Flame, ArrowRight, Check, TrendingUp, TrendingDown, Plus, Trash2, Scale, Target } from 'lucide-react-native';
import { useNutrition } from '@/context/NutritionContext';
import { kgToLbs, lbsToKg } from '@/services/tdeeCalculator';
import { getWeightLogs, addWeightLog, deleteWeightLog } from '@/services/storage';
import { WeightEntry } from '@/types/nutrition';
import { WeightLogModal } from '@/components/WeightLogModal';
import { PALETTE, FONTS } from '@/constants/theme';

export default function AnalyticsScreen() {
  const { stats, goals, userProfile, saveProfile, showToast } = useNutrition();

  const [timeRange, setTimeRange] = useState<'90D' | '6M' | '1Y' | 'ALL'>('6M');
  const [weightLogs, setWeightLogs] = useState<WeightEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);

  useEffect(() => {
    getWeightLogs().then((logs) => {
      setWeightLogs(logs);
      if (logs.length > 0) {
        setSelectedPointIdx(0);
      }
    });
  }, []);

  const currentWeightKg = userProfile.weightKg || (weightLogs[0]?.weightKg ?? 60);
  const currentWeightLbs = Math.round(kgToLbs(currentWeightKg) * 10) / 10;
  const goalWeightLbs = Math.round(kgToLbs(userProfile.targetWeightKg || 58) * 10) / 10;

  // Chronological logs (oldest to newest for charting)
  const chronologicalLogs = useMemo(() => {
    return [...weightLogs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [weightLogs]);

  // Filter logs by selected time range
  const filteredLogs = useMemo(() => {
    if (chronologicalLogs.length === 0) return [];
    if (timeRange === 'ALL') return chronologicalLogs;

    const now = new Date();
    const days = timeRange === '90D' ? 90 : timeRange === '6M' ? 180 : 365;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const subset = chronologicalLogs.filter((l) => new Date(l.date) >= cutoff);
    return subset.length >= 2 ? subset : chronologicalLogs;
  }, [chronologicalLogs, timeRange]);

  // Starting weight & total delta
  const startingWeightLbs = chronologicalLogs[0]?.weightLbs ?? currentWeightLbs;
  const totalChangeLbs = Math.round((currentWeightLbs - startingWeightLbs) * 10) / 10;
  const goalDeltaTotal = Math.abs(startingWeightLbs - goalWeightLbs) || 1;
  const progressMade = Math.abs(startingWeightLbs - currentWeightLbs);
  const goalProgressPercent = Math.min(Math.round((progressMade / goalDeltaTotal) * 100), 100);

  // BMI Calculation: weight (kg) / [height (m)]^2
  const heightM = (userProfile.heightCm || 175) / 100;
  const bmiValue = Math.round((currentWeightKg / (heightM * heightM)) * 10) / 10;
  const bmiCategory =
    bmiValue < 18.5 ? 'Underweight' : bmiValue < 25 ? 'Normal BMI' : bmiValue < 30 ? 'Overweight' : 'Obese';

  // SVG Chart Dimensions & coordinate normalization
  const chartWidth = 300;
  const chartHeight = 120;
  const paddingX = 24;
  const paddingY = 16;

  const chartData = useMemo(() => {
    if (filteredLogs.length === 0) return [];
    const minW = Math.min(...filteredLogs.map((l) => l.weightLbs)) - 1;
    const maxW = Math.max(...filteredLogs.map((l) => l.weightLbs)) + 1;
    const rangeW = maxW - minW || 1;

    const count = filteredLogs.length;
    return filteredLogs.map((log, idx) => {
      const x = paddingX + (idx / Math.max(count - 1, 1)) * (chartWidth - paddingX * 2);
      const normalizedY = (log.weightLbs - minW) / rangeW;
      const y = chartHeight - paddingY - normalizedY * (chartHeight - paddingY * 2);
      const dateLabel = new Date(`${log.date}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return { x, y, log, dateLabel };
    });
  }, [filteredLogs]);

  // Generate smooth SVG curve path
  const chartPath = useMemo(() => {
    if (chartData.length < 2) return '';
    let path = `M ${chartData[0].x} ${chartData[0].y}`;
    for (let i = 0; i < chartData.length - 1; i++) {
      const p0 = chartData[i];
      const p1 = chartData[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      path += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [chartData]);

  const activePoint = chartData[selectedPointIdx ?? chartData.length - 1] || chartData[chartData.length - 1];

  const handleAddWeight = async (data: {
    weightKg: number;
    weightLbs: number;
    date: string;
    note?: string;
  }) => {
    const updated = await addWeightLog(data);
    setWeightLogs(updated);
    // Update global userProfile active weight
    saveProfile({ ...userProfile, weightKg: data.weightKg }, goals);
    showToast('Weigh-In Saved', `${data.weightLbs} lbs recorded successfully.`, 'sparkles');
  };

  const handleDeleteWeight = async (id: string) => {
    const updated = await deleteWeightLog(id);
    setWeightLogs(updated);
    showToast('Entry Removed', 'Weight entry deleted.', 'sparkles');
  };

  // Streak days (S M T W T F S)
  const streakDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
        <TouchableOpacity
          style={styles.logWeightHeaderBtn}
          onPress={() => setIsModalOpen(true)}
          activeOpacity={0.85}>
          <Plus size={14} color={PALETTE[50]} />
          <Text style={styles.logWeightHeaderBtnText}>Log Weight</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Top 2 Cards: Weight Card & Streak Card */}
        <View style={styles.topCardsRow}>
          {/* Your Weight Card */}
          <View style={styles.weightCard}>
            <View>
              <Text style={styles.cardLabel}>CURRENT WEIGHT</Text>
              <Text style={styles.weightValue}>{currentWeightLbs} <Text style={styles.weightUnit}>lbs</Text></Text>
              <Text style={styles.goalWeightLabel}>Target {goalWeightLbs} lbs • {bmiCategory} ({bmiValue})</Text>
            </View>

            <TouchableOpacity
              style={styles.logWeightBtn}
              onPress={() => setIsModalOpen(true)}
              activeOpacity={0.85}>
              <Text style={styles.logWeightBtnText}>Record Weigh-in</Text>
              <ArrowRight size={12} color={PALETTE[50]} />
            </TouchableOpacity>
          </View>

          {/* Streak Card */}
          <View style={styles.streakCard}>
            <View style={styles.streakIconBox}>
              <Flame size={20} color={PALETTE[700]} fill={PALETTE[700]} />
            </View>
            <Text style={styles.streakCountNumber}>{stats.currentStreak || 21}</Text>
            <Text style={styles.streakTextLabel}>Day Streak</Text>

            <View style={styles.streakDaysRow}>
              {streakDays.map((d, i) => (
                <View key={i} style={styles.streakDayCol}>
                  <Text style={styles.streakDayLetter}>{d}</Text>
                  <View style={[styles.streakCheckCircle, i <= 4 && styles.streakCheckCircleActive]}>
                    {i <= 4 && <Check size={7} color={PALETTE[50]} strokeWidth={3} />}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Main Cal AI Interactive Weight Progress Chart Card */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Weight Progress</Text>
              <Text style={styles.chartSubtitle}>
                {totalChangeLbs <= 0 ? `${totalChangeLbs} lbs` : `+${totalChangeLbs} lbs`} since start
              </Text>
            </View>
            <View style={styles.goalPercentBadge}>
              <Text style={styles.goalPercentText}>🎯 {goalProgressPercent}% of goal</Text>
            </View>
          </View>

          {/* Rapid 1-Tap Adjustments Row */}
          <View style={styles.rapidAdjustRow}>
            <Text style={styles.rapidAdjustLabel}>Quick Log Today:</Text>
            <TouchableOpacity
              style={styles.rapidAdjustBtn}
              onPress={() => {
                const nextLbs = Math.round((currentWeightLbs - 0.5) * 10) / 10;
                handleAddWeight({
                  weightLbs: nextLbs,
                  weightKg: lbsToKg(nextLbs),
                  date: new Date().toISOString().split('T')[0],
                  note: 'Quick -0.5 lbs update',
                });
              }}>
              <Text style={styles.rapidAdjustBtnText}>-0.5 lbs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rapidAdjustBtn}
              onPress={() => {
                const nextLbs = Math.round((currentWeightLbs + 0.5) * 10) / 10;
                handleAddWeight({
                  weightLbs: nextLbs,
                  weightKg: lbsToKg(nextLbs),
                  date: new Date().toISOString().split('T')[0],
                  note: 'Quick +0.5 lbs update',
                });
              }}>
              <Text style={styles.rapidAdjustBtnText}>+0.5 lbs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rapidAdjustBtn, styles.rapidAdjustBtnCustom]}
              onPress={() => setIsModalOpen(true)}>
              <Text style={styles.rapidAdjustBtnCustomText}>Custom Weigh-In</Text>
            </TouchableOpacity>
          </View>

          {/* Interactive SVG Line Chart */}
          <View style={styles.svgContainer}>
            <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              <Defs>
                <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={PALETTE[600]} stopOpacity="0.25" />
                  <Stop offset="1" stopColor={PALETTE[600]} stopOpacity="0" />
                </LinearGradient>
              </Defs>

              {/* Grid Lines */}
              <Line x1="10" y1="24" x2={chartWidth - 10} y2="24" stroke={PALETTE[100]} strokeWidth="1" />
              <Line x1="10" y1="60" x2={chartWidth - 10} y2="60" stroke={PALETTE[100]} strokeWidth="1" />
              <Line x1="10" y1="96" x2={chartWidth - 10} y2="96" stroke={PALETTE[100]} strokeWidth="1" />

              {/* Goal Hairline */}
              <Line x1="10" y1="50" x2={chartWidth - 10} y2="50" stroke={PALETTE[300]} strokeWidth="1" strokeDasharray="4 4" />

              {/* Curve Line */}
              {chartPath ? (
                <Path
                  d={chartPath}
                  fill="none"
                  stroke={PALETTE[600]}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              ) : null}

              {/* Data Points */}
              {chartData.map((pt, i) => {
                const isSelected = activePoint === pt;
                return (
                  <Circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 5 : 3}
                    fill={isSelected ? PALETTE[950] : PALETTE[600]}
                    stroke={PALETTE.white}
                    strokeWidth={1.5}
                  />
                );
              })}
            </Svg>

            {/* Floating Tooltip Indicator */}
            {activePoint ? (
              <View
                style={[
                  styles.chartTooltip,
                  {
                    left: Math.max(10, Math.min(activePoint.x - 36, chartWidth - 80)),
                  },
                ]}>
                <Text style={styles.tooltipWeight}>{activePoint.log.weightLbs} lbs</Text>
                <Text style={styles.tooltipDate}>{activePoint.dateLabel}</Text>
              </View>
            ) : null}
          </View>

          {/* Month / Date Labels */}
          <View style={styles.monthLabelsRow}>
            {chartData.map((pt, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedPointIdx(i)}
                style={styles.monthLabelTouch}>
                <Text style={[styles.monthLabelText, activePoint === pt && styles.monthLabelTextActive]}>
                  {pt.dateLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Time Range Selector Pills (90D, 6M, 1Y, ALL) */}
          <View style={styles.rangePillsRow}>
            {(['90D', '6M', '1Y', 'ALL'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.rangePill, timeRange === r && styles.rangePillActive]}
                onPress={() => {
                  setTimeRange(r);
                  setSelectedPointIdx(0);
                }}
                activeOpacity={0.8}>
                <Text style={[styles.rangePillText, timeRange === r && styles.rangePillTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Motivation Banner */}
          <View style={styles.motivationBanner}>
            <Text style={styles.motivationText}>
              Great consistency! You are {goalProgressPercent}% of the way to your target weight.
            </Text>
          </View>
        </View>

        {/* Historical Weigh-In Log Table */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Weigh-in History</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(true)}>
              <Text style={styles.historyAddLink}>+ Add Log</Text>
            </TouchableOpacity>
          </View>

          {weightLogs.length === 0 ? (
            <Text style={styles.emptyHistoryText}>No weigh-in entries yet. Tap + Add Log to record.</Text>
          ) : (
            <View style={styles.historyList}>
              {weightLogs.slice(0, 5).map((log, idx) => {
                const prevLog = weightLogs[idx + 1];
                const diff = prevLog ? Math.round((log.weightLbs - prevLog.weightLbs) * 10) / 10 : 0;
                const isLoss = diff < 0;

                return (
                  <View key={log.id} style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyDate}>{log.date}</Text>
                      {log.note ? <Text style={styles.historyNote}>{log.note}</Text> : null}
                    </View>

                    <View style={styles.historyRight}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.historyWeightVal}>{log.weightLbs} lbs</Text>
                        {prevLog ? (
                          <View style={styles.diffRow}>
                            {isLoss ? (
                              <TrendingDown size={11} color={PALETTE[600]} />
                            ) : (
                              <TrendingUp size={11} color={PALETTE[400]} />
                            )}
                            <Text
                              style={[
                                styles.historyDiffText,
                                { color: isLoss ? PALETTE[600] : PALETTE[400] },
                              ]}>
                              {diff > 0 ? `+${diff}` : diff} lbs
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.historyDiffText}>Baseline</Text>
                        )}
                      </View>

                      <TouchableOpacity
                        onPress={() => handleDeleteWeight(log.id)}
                        style={styles.deleteLogBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Trash2 size={12} color={PALETTE[400]} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Daily Average Calories Card */}
        <View style={styles.avgCalCard}>
          <Text style={styles.avgCalLabel}>DAILY AVERAGE CALORIES</Text>
          <View style={styles.avgCalRow}>
            <Text style={styles.avgCalVal}>{goals.calories}</Text>
            <Text style={styles.avgCalUnit}>cal</Text>
            <View style={styles.growthBadge}>
              <TrendingUp size={12} color={PALETTE[600]} />
              <Text style={styles.growthText}>90% Adherence</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Interactive Weight Log Modal */}
      <WeightLogModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentWeightKg={currentWeightKg}
        onSave={handleAddWeight}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE[50],
    paddingTop: Platform.OS === 'android' ? 36 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontFamily: FONTS.serif,
    fontSize: 24,
    fontWeight: '700',
    color: PALETTE[950],
    letterSpacing: -0.5,
  },
  logWeightHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE[950],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logWeightHeaderBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[50],
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  topCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  weightCard: {
    flex: 1,
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE[100],
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '800',
    color: PALETTE[600],
    letterSpacing: 0.8,
  },
  weightValue: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    fontWeight: '700',
    color: PALETTE[950],
    marginTop: 2,
  },
  weightUnit: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE[400],
  },
  goalWeightLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '500',
    color: PALETTE[600],
    marginTop: 2,
    marginBottom: 10,
  },
  logWeightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: PALETTE[950],
    borderRadius: 8,
    paddingVertical: 7,
  },
  logWeightBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[50],
  },
  streakCard: {
    flex: 1,
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE[100],
    alignItems: 'center',
  },
  streakIconBox: {
    marginBottom: 2,
  },
  streakCountNumber: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    fontWeight: '700',
    color: PALETTE[950],
  },
  streakTextLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '600',
    color: PALETTE[600],
    marginBottom: 6,
  },
  streakDaysRow: {
    flexDirection: 'row',
    gap: 3,
  },
  streakDayCol: {
    alignItems: 'center',
    gap: 2,
  },
  streakDayLetter: {
    fontFamily: FONTS.sans,
    fontSize: 8,
    fontWeight: '700',
    color: PALETTE[400],
  },
  streakCheckCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PALETTE[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCheckCircleActive: {
    backgroundColor: PALETTE[600],
  },
  chartCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  chartTitle: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[950],
  },
  chartSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '500',
    color: PALETTE[600],
    marginTop: 1,
  },
  goalPercentBadge: {
    backgroundColor: PALETTE[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  goalPercentText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[700],
  },
  rapidAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    backgroundColor: PALETTE[50],
    padding: 8,
    borderRadius: 10,
  },
  rapidAdjustLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[600],
    marginRight: 2,
  },
  rapidAdjustBtn: {
    backgroundColor: PALETTE.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  rapidAdjustBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[950],
  },
  rapidAdjustBtnCustom: {
    marginLeft: 'auto',
    backgroundColor: PALETTE[950],
    borderColor: PALETTE[950],
  },
  rapidAdjustBtnCustomText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[50],
  },
  svgContainer: {
    position: 'relative',
    height: 120,
    marginTop: 6,
  },
  chartTooltip: {
    position: 'absolute',
    top: 0,
    backgroundColor: PALETTE[950],
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
  },
  tooltipWeight: {
    fontFamily: FONTS.serif,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[50],
  },
  tooltipDate: {
    fontFamily: FONTS.sans,
    fontSize: 8,
    color: PALETTE[300],
  },
  monthLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  monthLabelTouch: {
    paddingVertical: 2,
  },
  monthLabelText: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '600',
    color: PALETTE[400],
  },
  monthLabelTextActive: {
    color: PALETTE[950],
    fontWeight: '800',
  },
  rangePillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  rangePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: PALETTE[50],
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  rangePillActive: {
    backgroundColor: PALETTE[950],
    borderColor: PALETTE[950],
  },
  rangePillText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[600],
  },
  rangePillTextActive: {
    color: PALETTE[50],
  },
  motivationBanner: {
    backgroundColor: PALETTE[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  motivationText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE[800],
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[950],
  },
  historyAddLink: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[600],
  },
  emptyHistoryText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[400],
    paddingVertical: 8,
  },
  historyList: {
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE[50],
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontFamily: FONTS.serif,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[950],
  },
  historyNote: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[400],
    marginTop: 1,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyWeightVal: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  historyDiffText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '600',
    color: PALETTE[600],
  },
  deleteLogBtn: {
    padding: 3,
  },
  avgCalCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  avgCalLabel: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '800',
    color: PALETTE[600],
    letterSpacing: 0.8,
  },
  avgCalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  avgCalVal: {
    fontFamily: FONTS.serif,
    fontSize: 26,
    fontWeight: '700',
    color: PALETTE[950],
  },
  avgCalUnit: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE[500],
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 6,
  },
  growthText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[600],
  },
});
