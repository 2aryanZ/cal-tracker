import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, ArrowRight, Zap, Target, Flame, RefreshCw } from 'lucide-react-native';
import { useNutrition } from '@/context/NutritionContext';
import { generateCoachInsight } from '@/services/aiCoachService';
import { PALETTE, FONTS } from '@/constants/theme';
import { triggerLightImpact, triggerSelection } from '@/services/hapticsService';
import { MealType } from '@/types/nutrition';

interface AiCoachCardProps {
  onActionPress?: (meal: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    mealType: MealType;
  }) => void;
  onOpenScanner?: () => void;
}

export const AiCoachCard = React.memo(function AiCoachCard({ onActionPress, onOpenScanner }: AiCoachCardProps) {
  const {
    userAccount,
    consumed,
    goals,
    stats,
    userProfile,
    waterMl,
    dietaryPreference,
    entries,
    selectedDate,
  } = useNutrition();

  const dateEntries = useMemo(() => entries.filter((e) => e.date === selectedDate), [entries, selectedDate]);

  const insight = useMemo(() => {
    return generateCoachInsight({
      userName: userAccount.name,
      consumed,
      goals,
      stats,
      userProfile,
      waterMl,
      preference: dietaryPreference,
      activeEntries: dateEntries,
    });
  }, [userAccount.name, consumed, goals, stats, userProfile, waterMl, dietaryPreference, dateEntries]);

  const handleAction = () => {
    triggerLightImpact();
    if (insight.recommendation && onActionPress) {
      onActionPress({
        name: insight.recommendation.title,
        calories: insight.recommendation.calories,
        protein: insight.recommendation.protein,
        carbs: insight.recommendation.carbs,
        fats: insight.recommendation.fats,
        mealType: insight.recommendation.mealType,
      });
    } else if (onOpenScanner) {
      onOpenScanner();
    }
  };

  const getBadgeIcon = () => {
    switch (insight.badgeType) {
      case 'success':
        return <Sparkles size={11} color="#059669" />;
      case 'warning':
        return <Target size={11} color="#D97706" />;
      case 'streak':
        return <Flame size={11} color="#EA580C" fill="#EA580C" />;
      default:
        return <Zap size={11} color={PALETTE[700]} />;
    }
  };

  return (
    <View style={styles.card}>
      {/* Header with AI Badge & Greeting */}
      <View style={styles.headerRow}>
        <View style={styles.coachHeaderLeft}>
          <View style={styles.aiSparkleIconBox}>
            <Sparkles size={14} color={PALETTE[50]} />
          </View>
          <View>
            <Text style={styles.greetingText}>{insight.greeting}</Text>
            <Text style={styles.coachTitleText}>Personalized AI Coach</Text>
          </View>
        </View>

        <View style={styles.badgePill}>
          {getBadgeIcon()}
          <Text style={styles.badgeText}>{insight.badge}</Text>
        </View>
      </View>

      {/* Main Insight Title & Body */}
      <View style={styles.contentBody}>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightMessage}>{insight.message}</Text>
      </View>

      {/* Macro Pace Mini Ribbon */}
      <View style={styles.paceRibbon}>
        <View style={styles.paceItem}>
          <Text style={styles.paceLabel}>PROTEIN PACE</Text>
          <Text style={styles.paceVal}>
            {consumed.protein}/{goals.protein}g{' '}
            <Text style={styles.paceSub}>
              ({goals.protein > 0 ? Math.round((consumed.protein / goals.protein) * 100) : 0}%)
            </Text>
          </Text>
        </View>

        <View style={styles.paceDivider} />

        <View style={styles.paceItem}>
          <Text style={styles.paceLabel}>CALORIE BUDGET</Text>
          <Text style={styles.paceVal}>
            {insight.macroPace.calorieRemaining} kcal{' '}
            <Text style={styles.paceSub}>left</Text>
          </Text>
        </View>
      </View>

      {/* Action Recommendation Button */}
      {insight.recommendation ? (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleAction}
          activeOpacity={0.85}>
          <View style={styles.actionBtnLeft}>
            <View style={styles.recDot} />
            <Text style={styles.actionBtnText}>
              {insight.recommendation.actionText}: {insight.recommendation.title}
            </Text>
          </View>
          <ArrowRight size={13} color={PALETTE[50]} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  coachHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiSparkleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: PALETTE[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coachTitleText: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[950],
  },
  badgePill: {
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
  badgeText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[800],
  },
  contentBody: {
    marginBottom: 12,
  },
  insightTitle: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[950],
    marginBottom: 4,
  },
  insightMessage: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[600],
    lineHeight: 17,
  },
  paceRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE[50],
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  paceItem: {
    flex: 1,
  },
  paceLabel: {
    fontFamily: FONTS.sans,
    fontSize: 8,
    fontWeight: '800',
    color: PALETTE[500],
    letterSpacing: 0.6,
  },
  paceVal: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
    marginTop: 1,
  },
  paceSub: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[600],
    fontWeight: '500',
  },
  paceDivider: {
    width: 1,
    height: 24,
    backgroundColor: PALETTE[200],
    marginHorizontal: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PALETTE[950],
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  actionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 6,
  },
  recDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  actionBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[50],
  },
});
