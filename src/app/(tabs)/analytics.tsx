import React, { useState, useMemo } from 'react';
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
import {
  Flame,
  ArrowRight,
  Check,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Target,
  Zap,
  Activity,
  Calendar,
  Award,
  Sparkles,
  PieChart,
  BarChart3,
} from 'lucide-react-native';
import { useNutrition } from '@/context/NutritionContext';
import { kgToLbs, lbsToKg } from '@/services/tdeeCalculator';
import { getTodayDateString } from '@/services/storage';
import { WeightEntry } from '@/types/nutrition';
import { WeightLogModal } from '@/components/WeightLogModal';
import { MilestoneBadges } from '@/components/MilestoneBadges';
import { PALETTE, FONTS } from '@/constants/theme';
import { triggerLightImpact, triggerSelection } from '@/services/hapticsService';

export default function AnalyticsScreen() {
  const { stats, goals, userProfile, weightLogs, milestoneBadges, entries, addWeight, deleteWeight } = useNutrition();



  const [timeRange, setTimeRange] = useState<'30D' | '60D' | '90D' | '6M' | '1Y' | 'ALL'>('30D');
  const [unit, setUnit] = useState<'kg' | 'lbs'>(userProfile.unitSystem === 'imperial' ? 'lbs' : 'kg');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);

  const isKg = unit === 'kg';
  const unitLabel = isKg ? 'kg' : 'lbs';

  // Latest recorded weigh-in takes precedence across the entire app
  const currentWeightKg = weightLogs[0]?.weightKg ?? userProfile.weightKg ?? 75;
  const currentWeightLbs = Math.round(kgToLbs(currentWeightKg) * 10) / 10;
  const goalWeightKg = userProfile.targetWeightKg || 74;
  const goalWeightLbs = Math.round(kgToLbs(goalWeightKg) * 10) / 10;

  const displayedCurrentWeight = isKg ? currentWeightKg : currentWeightLbs;
  const displayedGoalWeight = isKg ? goalWeightKg : goalWeightLbs;

  // Chronological logs (oldest to newest for charting)
  const chronologicalLogs = useMemo(() => {
    return [...weightLogs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [weightLogs]);

  // Filter logs by selected time range (30D, 60D, 90D, 6M, 1Y, ALL)
  const filteredLogs = useMemo(() => {
    if (chronologicalLogs.length === 0) return [];
    if (timeRange === 'ALL') return chronologicalLogs;

    const now = new Date();
    const days =
      timeRange === '30D'
        ? 30
        : timeRange === '60D'
        ? 60
        : timeRange === '90D'
        ? 90
        : timeRange === '6M'
        ? 180
        : 365;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const subset = chronologicalLogs.filter((l) => new Date(l.date) >= cutoff);
    return subset.length >= 1 ? subset : chronologicalLogs;
  }, [chronologicalLogs, timeRange]);

  // Starting weight & total delta in active unit
  const startingVal = isKg
    ? (chronologicalLogs[0]?.weightKg ?? currentWeightKg)
    : (chronologicalLogs[0]?.weightLbs ?? currentWeightLbs);
  const totalChangeVal = Math.round((displayedCurrentWeight - startingVal) * 10) / 10;
  const goalDeltaTotal = Math.abs(startingVal - displayedGoalWeight) || 1;
  const progressMade = Math.abs(startingVal - displayedCurrentWeight);
  const goalProgressPercent = Math.min(Math.round((progressMade / goalDeltaTotal) * 100), 100);

  // BMI Calculation: weight (kg) / [height (m)]^2
  const heightM = (userProfile.heightCm || 178) / 100;
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
    const getLogWeight = (l: WeightEntry) => (isKg ? l.weightKg : l.weightLbs);
    const minW = Math.min(...filteredLogs.map(getLogWeight)) - (isKg ? 0.4 : 1);
    const maxW = Math.max(...filteredLogs.map(getLogWeight)) + (isKg ? 0.4 : 1);
    const rangeW = maxW - minW || 1;

    const count = filteredLogs.length;
    return filteredLogs.map((log, idx) => {
      const val = getLogWeight(log);
      const x = count === 1 ? chartWidth / 2 : paddingX + (idx / Math.max(count - 1, 1)) * (chartWidth - paddingX * 2);
      const normalizedY = count === 1 ? 0.5 : (val - minW) / rangeW;
      const y = chartHeight - paddingY - normalizedY * (chartHeight - paddingY * 2);

      const [year, month, day] = log.date.split('-').map(Number);
      const dObj = new Date(year, month - 1, day);
      const dateLabel = dObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return { x, y, log, val, dateLabel };
    });
  }, [filteredLogs, isKg]);

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

  const activePoint =
    selectedPointIdx !== null && chartData[selectedPointIdx]
      ? chartData[selectedPointIdx]
      : chartData[chartData.length - 1] || { val: displayedCurrentWeight, dateLabel: 'Today' };

  const handleAddWeight = async (data: {
    weightKg: number;
    weightLbs: number;
    date: string;
    note?: string;
  }) => {
    await addWeight(data);
  };

  const handleDeleteWeight = async (id: string) => {
    await deleteWeight(id);
  };


  // Macro Adherence & Trend Analysis Calculations (O(N) single pass)
  const trendAnalysis = useMemo(() => {
    const todayStr = getTodayDateString();
    let dayCalories = 0;
    let dayProtein = 0;
    let dayCarbs = 0;
    let dayFats = 0;

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.date === todayStr) {
        dayCalories += Number(e.calories) || 0;
        dayProtein += Number(e.protein) || 0;
        dayCarbs += Number(e.carbs) || 0;
        dayFats += Number(e.fats) || 0;
      }
    }

    const proteinAdherence = goals.protein > 0 ? Math.min(100, Math.round((dayProtein / goals.protein) * 100)) : 94;
    const carbAdherence = goals.carbs > 0 ? Math.min(100, Math.round((dayCarbs / goals.carbs) * 100)) : 88;
    const fatAdherence = goals.fats > 0 ? Math.min(100, Math.round((dayFats / goals.fats) * 100)) : 86;
    const overallAdherence = Math.round((proteinAdherence + carbAdherence + fatAdherence) / 3);

    const dailyDeficit = userProfile.goal === 'fat_loss' ? -500 : userProfile.goal === 'muscle_gain' ? 350 : 0;
    const weeklyPaceKcal = dailyDeficit * 7;
    const weeklyPaceWeight = isKg ? Math.abs(weeklyPaceKcal / 7700) : Math.abs(weeklyPaceKcal / 3500);

    const weeksToGoal = Math.max(1, Math.round(Math.abs(displayedCurrentWeight - displayedGoalWeight) / (weeklyPaceWeight || 0.4)));
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + weeksToGoal * 7);
    const targetDateStr = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return {
      proteinAdherence,
      carbAdherence,
      fatAdherence,
      overallAdherence,
      dailyDeficit,
      weeklyPaceKcal,
      weeklyPaceWeight: (weeklyPaceWeight || 0.45).toFixed(2),
      weeksToGoal,
      targetDateStr,
    };
  }, [entries, goals, userProfile, isKg, displayedCurrentWeight, displayedGoalWeight]);

  // Streak days (S M T W T F S)
  const streakDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];


  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header with Unit Toggle Switch */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
        <View style={styles.headerRightActions}>
          {/* Unit Toggle Pill: KG / LBS */}
          <View style={styles.unitTogglePillContainer}>
            <TouchableOpacity
              style={[styles.unitToggleOption, isKg && styles.unitToggleOptionActive]}
              onPress={() => {
                triggerSelection();
                setUnit('kg');
              }}
              activeOpacity={0.8}>
              <Text style={[styles.unitToggleOptionText, isKg && styles.unitToggleOptionTextActive]}>
                KG
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitToggleOption, !isKg && styles.unitToggleOptionActive]}
              onPress={() => {
                triggerSelection();
                setUnit('lbs');
              }}
              activeOpacity={0.8}>
              <Text style={[styles.unitToggleOptionText, !isKg && styles.unitToggleOptionTextActive]}>
                LBS
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logWeightHeaderBtn}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.85}>
            <Plus size={14} color={PALETTE[50]} />
            <Text style={styles.logWeightHeaderBtnText}>Log Weight</Text>
          </TouchableOpacity>
        </View>
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
              <Text style={styles.weightValue}>{displayedCurrentWeight} <Text style={styles.weightUnit}>{unitLabel}</Text></Text>
              <Text style={styles.goalWeightLabel}>Target {displayedGoalWeight} {unitLabel} • {bmiCategory} ({bmiValue})</Text>
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
                {totalChangeVal <= 0 ? `${totalChangeVal} ${unitLabel}` : `+${totalChangeVal} ${unitLabel}`} since start
              </Text>
            </View>
            <View style={styles.goalPercentBadge}>
              <Text style={styles.goalPercentText}>🎯 {goalProgressPercent}% of goal</Text>
            </View>
          </View>

          {/* Rapid 1-Tap Adjustments Row */}
          <View style={styles.rapidAdjustRow}>
            <Text style={styles.rapidAdjustLabel}>Quick Log:</Text>
            <TouchableOpacity
              style={styles.rapidAdjustBtn}
              onPress={() => {
                triggerLightImpact();
                const delta = isKg ? 0.2 : 0.5;
                const nextVal = Math.round((displayedCurrentWeight - delta) * 10) / 10;
                handleAddWeight({
                  weightKg: isKg ? nextVal : lbsToKg(nextVal),
                  weightLbs: isKg ? kgToLbs(nextVal) : nextVal,
                  date: getTodayDateString(),
                  note: `Quick -${delta} ${unitLabel} update`,
                });
              }}>
              <Text style={styles.rapidAdjustBtnText}>-{isKg ? '0.2 kg' : '0.5 lbs'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rapidAdjustBtn}
              onPress={() => {
                triggerLightImpact();
                const delta = isKg ? 0.2 : 0.5;
                const nextVal = Math.round((displayedCurrentWeight + delta) * 10) / 10;
                handleAddWeight({
                  weightKg: isKg ? nextVal : lbsToKg(nextVal),
                  weightLbs: isKg ? kgToLbs(nextVal) : nextVal,
                  date: getTodayDateString(),
                  note: `Quick +${delta} ${unitLabel} update`,
                });
              }}>
              <Text style={styles.rapidAdjustBtnText}>+{isKg ? '0.2 kg' : '0.5 lbs'}</Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={[styles.rapidAdjustBtn, styles.rapidAdjustBtnCustom]}
              onPress={() => {
                triggerLightImpact();
                setIsModalOpen(true);
              }}>
              <Text style={styles.rapidAdjustBtnCustomText}>Custom</Text>
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
                <Text style={styles.tooltipWeight}>{activePoint.val} {unitLabel}</Text>
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

          {/* Time Range Selector Pills (30D, 60D, 90D, 6M, 1Y, ALL) */}
          <View style={styles.rangePillsRow}>
            {(['30D', '60D', '90D', '6M', '1Y', 'ALL'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.rangePill, timeRange === r && styles.rangePillActive]}
                onPress={() => {
                  triggerSelection();
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

        {/* Dynamic Trend Analysis & Macro Adherence Card */}
        <View style={styles.trendAnalysisCard}>
          <View style={styles.trendHeaderRow}>
            <View style={styles.trendHeaderLeft}>
              <BarChart3 size={16} color={PALETTE[950]} />
              <Text style={styles.trendTitle}>Trend Analysis & Pacing</Text>
            </View>
            <View style={styles.adherenceScorePill}>
              <Sparkles size={11} color="#059669" />
              <Text style={styles.adherenceScoreText}>
                {trendAnalysis.overallAdherence}% Macro Score
              </Text>
            </View>
          </View>

          {/* Macro Split Progress Row */}
          <View style={styles.macroSplitRow}>
            <View style={styles.macroSplitCol}>
              <Text style={styles.macroSplitLabel}>Protein ({trendAnalysis.proteinAdherence}%)</Text>
              <View style={styles.macroSplitTrack}>
                <View style={[styles.macroSplitFill, { width: `${trendAnalysis.proteinAdherence}%`, backgroundColor: PALETTE[700] }]} />
              </View>
            </View>

            <View style={styles.macroSplitCol}>
              <Text style={styles.macroSplitLabel}>Carbs ({trendAnalysis.carbAdherence}%)</Text>
              <View style={styles.macroSplitTrack}>
                <View style={[styles.macroSplitFill, { width: `${trendAnalysis.carbAdherence}%`, backgroundColor: PALETTE[500] }]} />
              </View>
            </View>

            <View style={styles.macroSplitCol}>
              <Text style={styles.macroSplitLabel}>Fats ({trendAnalysis.fatAdherence}%)</Text>
              <View style={styles.macroSplitTrack}>
                <View style={[styles.macroSplitFill, { width: `${trendAnalysis.fatAdherence}%`, backgroundColor: PALETTE[400] }]} />
              </View>
            </View>
          </View>

          {/* Forecast Pacing Callout */}
          <View style={styles.paceCalloutBox}>
            <View style={styles.paceCalloutItem}>
              <Text style={styles.paceCalloutLabel}>WEEKLY DEFICIT PACE</Text>
              <Text style={styles.paceCalloutVal}>
                {trendAnalysis.weeklyPaceKcal < 0 ? `${trendAnalysis.weeklyPaceKcal}` : `+${trendAnalysis.weeklyPaceKcal}`} kcal
              </Text>
              <Text style={styles.paceCalloutSub}>~{trendAnalysis.weeklyPaceWeight} {unitLabel}/week</Text>
            </View>

            <View style={styles.paceCalloutDivider} />

            <View style={styles.paceCalloutItem}>
              <Text style={styles.paceCalloutLabel}>PROJECTED GOAL DATE</Text>
              <Text style={styles.paceCalloutVal}>{trendAnalysis.targetDateStr}</Text>
              <Text style={styles.paceCalloutSub}>in ~{trendAnalysis.weeksToGoal} weeks</Text>
            </View>
          </View>
        </View>

        {/* Milestone Badges Showcase */}
        <MilestoneBadges badges={milestoneBadges} />

        {/* Goal Milestone & Metabolic Forecast Card */}
        <View style={styles.forecastCard}>
          <View style={styles.forecastHeader}>
            <View style={styles.forecastHeaderLeft}>
              <Target size={16} color={PALETTE[950]} />
              <Text style={styles.forecastTitle}>Goal Projection</Text>
            </View>
            <View style={styles.forecastPill}>
              <Calendar size={11} color={PALETTE[700]} />
              <Text style={styles.forecastPillText}>
                Estimated ~{Math.max(1, Math.round(Math.abs(displayedCurrentWeight - displayedGoalWeight) / (isKg ? 0.5 : 1.2)))} Weeks
              </Text>
            </View>
          </View>

          <View style={styles.forecastGrid}>
            <View style={styles.forecastItem}>
              <View style={styles.forecastIconBox}>
                <Zap size={14} color="#D97706" />
              </View>
              <Text style={styles.forecastVal}>{Math.round(10 * (userProfile.weightKg || 70) + 6.25 * (userProfile.heightCm || 175) - 5 * (userProfile.age || 25) + 5)} kcal</Text>
              <Text style={styles.forecastLabel}>Basal Metabolic (BMR)</Text>
            </View>

            <View style={styles.forecastItem}>
              <View style={styles.forecastIconBox}>
                <Activity size={14} color="#059669" />
              </View>
              <Text style={styles.forecastVal}>{goals.calories} kcal</Text>
              <Text style={styles.forecastLabel}>Daily Target Budget</Text>
            </View>

            <View style={styles.forecastItem}>
              <View style={styles.forecastIconBox}>
                <Flame size={14} color="#DC2626" fill="#DC2626" />
              </View>
              <Text style={styles.forecastVal}>
                {userProfile.goal === 'fat_loss' ? '-500 kcal' : userProfile.goal === 'muscle_gain' ? '+350 kcal' : '±0 kcal'}
              </Text>
              <Text style={styles.forecastLabel}>Daily Energy Deficit</Text>
            </View>
          </View>
        </View>

        {/* Historical Weigh-In Log Table */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Weigh-in History ({unitLabel})</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(true)}>
              <Text style={styles.historyAddLink}>+ Add Log</Text>
            </TouchableOpacity>
          </View>

          {weightLogs.length === 0 ? (
            <Text style={styles.emptyHistoryText}>No weigh-in entries yet. Tap + Add Log to record.</Text>
          ) : (
            <View style={styles.historyList}>
              {weightLogs.slice(0, 6).map((log, idx) => {
                const prevLog = weightLogs[idx + 1];
                const rowWeight = isKg ? log.weightKg : log.weightLbs;
                const prevWeight = prevLog ? (isKg ? prevLog.weightKg : prevLog.weightLbs) : null;
                const diff = prevWeight !== null ? Math.round((rowWeight - prevWeight) * 10) / 10 : 0;
                const isLoss = diff < 0;

                return (
                  <View key={log.id} style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyDate}>{log.date}</Text>
                      {log.note ? <Text style={styles.historyNote}>{log.note}</Text> : null}
                    </View>

                    <View style={styles.historyRight}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.historyWeightVal}>{rowWeight} {unitLabel}</Text>
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
                              {diff > 0 ? `+${diff}` : diff} {unitLabel}
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
        initialUnit={unit}
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitTogglePillContainer: {
    flexDirection: 'row',
    backgroundColor: PALETTE[100],
    borderRadius: 8,
    padding: 2,
  },
  unitToggleOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitToggleOptionActive: {
    backgroundColor: PALETTE[950],
  },
  unitToggleOptionText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '800',
    color: PALETTE[600],
  },
  unitToggleOptionTextActive: {
    color: PALETTE[50],
  },
  logWeightHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE[950],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
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
  trendAnalysisCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  trendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trendHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendTitle: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[950],
  },
  adherenceScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  adherenceScoreText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  macroSplitRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  macroSplitCol: {
    flex: 1,
  },
  macroSplitLabel: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '700',
    color: PALETTE[600],
    marginBottom: 4,
  },
  macroSplitTrack: {
    height: 5,
    backgroundColor: PALETTE[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroSplitFill: {
    height: '100%',
    borderRadius: 3,
  },
  paceCalloutBox: {
    flexDirection: 'row',
    backgroundColor: PALETTE[50],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  paceCalloutItem: {
    flex: 1,
  },
  paceCalloutLabel: {
    fontFamily: FONTS.sans,
    fontSize: 8,
    fontWeight: '800',
    color: PALETTE[500],
    letterSpacing: 0.6,
  },
  paceCalloutVal: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[950],
    marginTop: 2,
  },
  paceCalloutSub: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[600],
    marginTop: 1,
  },
  paceCalloutDivider: {
    width: 1,
    height: '100%',
    backgroundColor: PALETTE[200],
    marginHorizontal: 12,
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
  forecastCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: PALETTE[100],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  forecastHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  forecastTitle: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[950],
  },
  forecastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  forecastPillText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[700],
  },
  forecastGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  forecastItem: {
    flex: 1,
    backgroundColor: PALETTE[50],
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  forecastIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  forecastVal: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
    textAlign: 'center',
  },
  forecastLabel: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '600',
    color: PALETTE[600],
    textAlign: 'center',
    marginTop: 2,
  },
});
