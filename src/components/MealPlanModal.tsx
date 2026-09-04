import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Sparkles, X, Check, Utensils, RefreshCw, ChefHat, ArrowRight } from 'lucide-react-native';
import { generateDailyMealPlan } from '@/services/mealPlanService';
import { AiMealPlan, AiMealPlanItem, DietaryPreference, MacroTargets, MealType } from '@/types/nutrition';
import { PALETTE, FONTS } from '@/constants/theme';
import { triggerLightImpact, triggerSuccessFeedback } from '@/services/hapticsService';

interface MealPlanModalProps {
  visible: boolean;
  onClose: () => void;
  goals: MacroTargets;
  currentPreference: DietaryPreference;
  onLogMealItem: (item: AiMealPlanItem) => void;
  onApplyFullPlan: (plan: AiMealPlan) => void;
}

const DIET_TABS: { key: DietaryPreference; label: string }[] = [
  { key: 'high_protein', label: 'High Protein' },
  { key: 'balanced', label: 'Balanced' },
  { key: 'keto', label: 'Keto' },
  { key: 'vegan', label: 'Vegan' },
];

export function MealPlanModal({
  visible,
  onClose,
  goals,
  currentPreference,
  onLogMealItem,
  onApplyFullPlan,
}: MealPlanModalProps) {
  const [preference, setPreference] = useState<DietaryPreference>(currentPreference || 'high_protein');
  const [mealPlan, setMealPlan] = useState<AiMealPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (pref?: DietaryPreference) => {
    const selectedPref = pref || preference;
    setIsGenerating(true);
    try {
      const plan = await generateDailyMealPlan(goals, selectedPref);
      setMealPlan(plan);
      triggerSuccessFeedback();
    } catch (err) {
      console.error('Failed to generate meal plan:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setPreference(currentPreference || 'high_protein');
      handleGenerate(currentPreference || 'high_protein');
    }
  }, [visible, currentPreference]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.planIconBox}>
                <ChefHat size={16} color={PALETTE[50]} />
              </View>
              <View>
                <Text style={styles.title}>AI Meal Plan Generator</Text>
                <Text style={styles.subtitle}>
                  Tailored to your {goals.calories} kcal & {goals.protein}g protein goals
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={PALETTE[600]} />
            </TouchableOpacity>
          </View>

          {/* Dietary Preference Filter Pills */}
          <View style={styles.dietTabsRow}>
            {DIET_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.dietTab, preference === tab.key && styles.dietTabActive]}
                onPress={() => {
                  triggerLightImpact();
                  setPreference(tab.key);
                  handleGenerate(tab.key);
                }}>
                <Text style={[styles.dietTabText, preference === tab.key && styles.dietTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isGenerating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={PALETTE[950]} />
              <Text style={styles.loadingText}>Crafting optimal macro blueprint...</Text>
            </View>
          ) : mealPlan ? (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {/* Plan Summary Banner */}
              <View style={styles.summaryBanner}>
                <View>
                  <Text style={styles.summaryTitle}>{mealPlan.title}</Text>
                  <Text style={styles.summarySub}>{mealPlan.summary}</Text>
                </View>
                <TouchableOpacity
                  style={styles.regenBtn}
                  onPress={() => handleGenerate()}
                  activeOpacity={0.8}>
                  <RefreshCw size={12} color={PALETTE[700]} />
                  <Text style={styles.regenBtnText}>Regenerate</Text>
                </TouchableOpacity>
              </View>

              {/* 4 Meal Cards */}
              {mealPlan.meals.map((meal, index) => (
                <View key={index} style={styles.mealCard}>
                  <View style={styles.mealHeader}>
                    <View style={styles.mealBadge}>
                      <Text style={styles.mealBadgeText}>{meal.mealType.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.mealCalsText}>
                      {meal.calories} kcal • {meal.protein}g P
                    </Text>
                  </View>

                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealDesc}>{meal.description}</Text>

                  {/* Ingredients Tags */}
                  <View style={styles.ingredientsRow}>
                    {meal.ingredients.map((ing, i) => (
                      <View key={i} style={styles.ingredientPill}>
                        <Text style={styles.ingredientText}>{ing}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Single Meal 1-Tap Log Button */}
                  <TouchableOpacity
                    style={styles.logSingleBtn}
                    onPress={() => {
                      triggerLightImpact();
                      onLogMealItem(meal);
                    }}
                    activeOpacity={0.85}>
                    <Text style={styles.logSingleBtnText}>Log this {meal.mealType}</Text>
                    <ArrowRight size={11} color={PALETTE[950]} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Apply Full Plan Button */}
              <TouchableOpacity
                style={styles.applyFullBtn}
                onPress={() => {
                  triggerSuccessFeedback();
                  onApplyFullPlan(mealPlan);
                  onClose();
                }}
                activeOpacity={0.85}>
                <Check size={16} color={PALETTE[50]} />
                <Text style={styles.applyFullBtnText}>Apply & Log All 4 Meals ({mealPlan.targetCalories} kcal)</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 35, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: PALETTE.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PALETTE[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 17,
    fontWeight: '700',
    color: PALETTE[950],
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dietTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  dietTabActive: {
    backgroundColor: PALETTE[950],
    borderColor: PALETTE[950],
  },
  dietTabText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE[600],
  },
  dietTabTextActive: {
    color: PALETTE[50],
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[600],
    fontWeight: '600',
  },
  scrollArea: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  summaryBanner: {
    backgroundColor: PALETTE[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  summarySub: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[600],
    marginTop: 2,
    maxWidth: 220,
  },
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  regenBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[800],
  },
  mealCard: {
    backgroundColor: '#F8FCFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mealBadge: {
    backgroundColor: PALETTE[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mealBadgeText: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '800',
    color: PALETTE[700],
  },
  mealCalsText: {
    fontFamily: FONTS.serif,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[950],
  },
  mealName: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[950],
    marginBottom: 2,
  },
  mealDesc: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    marginBottom: 6,
    lineHeight: 15,
  },
  ingredientsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  ingredientPill: {
    backgroundColor: PALETTE.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  ingredientText: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    color: PALETTE[600],
  },
  logSingleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: PALETTE.white,
    borderRadius: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  logSingleBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[950],
  },
  applyFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PALETTE[950],
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  applyFullBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[50],
  },
});
