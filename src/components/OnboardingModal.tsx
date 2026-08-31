import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Target,
  Flame,
  Activity,
  Award,
  Zap,
  Info,
  User,
  Heart,
  TrendingUp,
  Scale,
} from 'lucide-react-native';
import {
  UserProfile,
  FitnessGoal,
  ActivityLevel,
  Gender,
  calculateNutritionPlan,
  lbsToKg,
  kgToLbs,
  ftInToCm,
  cmToFtIn,
} from '@/services/tdeeCalculator';
import { MacroTargets } from '@/types/nutrition';
import { PALETTE, FONTS } from '@/constants/theme';

interface OnboardingModalProps {
  visible: boolean;
  onClose: () => void;
  initialProfile: UserProfile;
  onComplete: (profile: UserProfile, targets: MacroTargets) => void;
}

const GOALS_LIST: { id: FitnessGoal; title: string; desc: string; icon: any; badge: string }[] = [
  {
    id: 'fat_loss',
    title: 'Lose Weight & Fat',
    desc: 'Sustainable 500 kcal deficit to lose ~0.5kg (1.1 lbs) fat per week while preserving muscle.',
    icon: Flame,
    badge: 'Popular',
  },
  {
    id: 'muscle_gain',
    title: 'Build Muscle (Lean Bulk)',
    desc: 'Controlled 300 kcal surplus to maximize muscle protein synthesis with minimal fat gain.',
    icon: TrendingUp,
    badge: 'High Protein',
  },
  {
    id: 'recomposition',
    title: 'Body Recomposition',
    desc: 'Slight deficit with maximum protein intake (2.2g/kg) to burn fat and build muscle simultaneously.',
    icon: Zap,
    badge: 'Advanced',
  },
  {
    id: 'maintenance',
    title: 'Maintain Weight & Health',
    desc: 'Balanced nutrition at your exact daily energy expenditure to sustain current weight and energy.',
    icon: Scale,
    badge: 'Healthy Balance',
  },
];

const ACTIVITY_LIST: { id: ActivityLevel; title: string; steps: string; desc: string; icon: any }[] = [
  {
    id: 'sedentary',
    title: 'Sedentary',
    steps: '< 5,000 steps/day',
    desc: 'Desk job, little to no intentional exercise throughout the week.',
    icon: User,
  },
  {
    id: 'light',
    title: 'Lightly Active',
    steps: '5,000 - 8,000 steps/day',
    desc: 'Casual walking, light daily movement or exercise 1-2 days/week.',
    icon: Activity,
  },
  {
    id: 'moderate',
    title: 'Moderately Active',
    steps: '8,000 - 12,000 steps/day',
    desc: 'Regular gym/fitness training 3-5 days/week or active on feet.',
    icon: Heart,
  },
  {
    id: 'very_active',
    title: 'Very Active',
    steps: '12,000+ steps/day',
    desc: 'Intense endurance / heavy lifting or highly active physical occupation.',
    icon: Award,
  },
];

export function OnboardingModal({
  visible,
  onClose,
  initialProfile,
  onComplete,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');

  // Form State
  const [goal, setGoal] = useState<FitnessGoal>(initialProfile.goal || 'fat_loss');
  const [gender, setGender] = useState<Gender>(initialProfile.gender || 'male');
  const [age, setAge] = useState<string>(String(initialProfile.age || 25));
  const [weightKg, setWeightKg] = useState<string>(String(initialProfile.weightKg || 75));
  const [weightLbs, setWeightLbs] = useState<string>(String(kgToLbs(initialProfile.weightKg || 75)));
  const [heightCm, setHeightCm] = useState<string>(String(initialProfile.heightCm || 175));
  const [heightFeet, setHeightFeet] = useState<string>(
    String(cmToFtIn(initialProfile.heightCm || 175).feet)
  );
  const [heightInches, setHeightInches] = useState<string>(
    String(cmToFtIn(initialProfile.heightCm || 175).inches)
  );
  const [activity, setActivity] = useState<ActivityLevel>(initialProfile.activityLevel || 'moderate');

  // Compute live current profile
  const currentProfile: UserProfile = useMemo(() => {
    let finalWeight = Number(weightKg) || 75;
    if (unitSystem === 'imperial') {
      finalWeight = lbsToKg(Number(weightLbs) || 165);
    }

    let finalHeight = Number(heightCm) || 175;
    if (unitSystem === 'imperial') {
      finalHeight = ftInToCm(Number(heightFeet) || 5, Number(heightInches) || 9);
    }

    const finalWeightKg = Math.round(finalWeight * 10) / 10;
    const finalHeightCm = Math.round(finalHeight);

    return {
      age: Number(age) || 25,
      gender,
      weightKg: finalWeightKg,
      targetWeightKg: Math.round((goal === 'fat_loss' ? finalWeightKg * 0.9 : goal === 'muscle_gain' ? finalWeightKg * 1.08 : finalWeightKg) * 10) / 10,
      heightCm: finalHeightCm,
      dailySteps: activity === 'very_active' ? 14000 : activity === 'moderate' ? 10000 : activity === 'light' ? 6500 : 3500,
      activityLevel: activity,
      goal,
      unitSystem,
    };
  }, [gender, age, weightKg, weightLbs, heightCm, heightFeet, heightInches, activity, goal, unitSystem]);

  // Compute live Mifflin-St Jeor plan
  const plan = useMemo(() => {
    return calculateNutritionPlan(currentProfile);
  }, [currentProfile]);

  const handleNext = () => {
    if (step < 4) {
      setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
    } else {
      onComplete(currentProfile, plan.macros);
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
    } else {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Sparkles size={16} color={PALETTE[950]} />
              <Text style={styles.headerBrand}>Cal tracker</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={PALETTE[950]} />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(step / 4) * 100}%` }]} />
          </View>

          {/* Step 1: Goal Selection */}
          {step === 1 && (
            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.stepTitle}>What's your primary goal?</Text>
              <Text style={styles.stepSubtitle}>
                We calculate precise metabolic targets tailored to your objective.
              </Text>

              <View style={styles.optionsList}>
                {GOALS_LIST.map((g) => {
                  const isSelected = goal === g.id;
                  const Icon = g.icon;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.goalCard, isSelected && styles.goalCardSelected]}
                      onPress={() => setGoal(g.id)}
                      activeOpacity={0.8}>
                      <View style={styles.goalCardTop}>
                        <View style={styles.goalCardIconBox}>
                          <Icon size={18} color={isSelected ? PALETTE[950] : PALETTE[600]} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.goalTitleRow}>
                            <Text style={styles.goalTitle}>{g.title}</Text>
                            <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                              <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>
                                {g.badge}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.goalDesc}>{g.desc}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Step 2: Biometrics */}
          {step === 2 && (
            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.stepTitle}>Your body metrics</Text>
              <Text style={styles.stepSubtitle}>
                Used to compute your Basal Metabolic Rate (BMR) with clinical accuracy.
              </Text>

              {/* Metric / Imperial Selector */}
              <View style={styles.unitToggleRow}>
                <TouchableOpacity
                  style={[styles.unitBtn, unitSystem === 'metric' && styles.unitBtnActive]}
                  onPress={() => setUnitSystem('metric')}>
                  <Text style={[styles.unitBtnText, unitSystem === 'metric' && styles.unitBtnTextActive]}>
                    Metric (kg / cm)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitBtn, unitSystem === 'imperial' && styles.unitBtnActive]}
                  onPress={() => setUnitSystem('imperial')}>
                  <Text style={[styles.unitBtnText, unitSystem === 'imperial' && styles.unitBtnTextActive]}>
                    Imperial (lbs / ft)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Biological Sex */}
              <Text style={styles.inputSectionLabel}>BIOLOGICAL SEX</Text>
              <View style={styles.sexRow}>
                <TouchableOpacity
                  style={[styles.sexBtn, gender === 'male' && styles.sexBtnActive]}
                  onPress={() => setGender('male')}>
                  <Text style={[styles.sexLabel, gender === 'male' && styles.sexLabelActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sexBtn, gender === 'female' && styles.sexBtnActive]}
                  onPress={() => setGender('female')}>
                  <Text style={[styles.sexLabel, gender === 'female' && styles.sexLabelActive]}>Female</Text>
                </TouchableOpacity>
              </View>

              {/* Age, Weight, Height Grid */}
              <View style={styles.inputsGrid}>
                {/* Age */}
                <View style={styles.gridItem}>
                  <Text style={styles.inputSectionLabel}>AGE</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      value={age}
                      onChangeText={setAge}
                      keyboardType="numeric"
                      style={styles.textInput}
                    />
                    <Text style={styles.inputUnit}>yrs</Text>
                  </View>
                </View>

                {/* Weight */}
                <View style={styles.gridItem}>
                  <Text style={styles.inputSectionLabel}>WEIGHT</Text>
                  <View style={styles.inputBox}>
                    {unitSystem === 'metric' ? (
                      <>
                        <TextInput
                          value={weightKg}
                          onChangeText={(v) => {
                            setWeightKg(v);
                            setWeightLbs(String(kgToLbs(Number(v) || 0)));
                          }}
                          keyboardType="numeric"
                          style={styles.textInput}
                        />
                        <Text style={styles.inputUnit}>kg</Text>
                      </>
                    ) : (
                      <>
                        <TextInput
                          value={weightLbs}
                          onChangeText={(v) => {
                            setWeightLbs(v);
                            setWeightKg(String(lbsToKg(Number(v) || 0)));
                          }}
                          keyboardType="numeric"
                          style={styles.textInput}
                        />
                        <Text style={styles.inputUnit}>lbs</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {/* Height */}
              <Text style={styles.inputSectionLabel}>HEIGHT</Text>
              {unitSystem === 'metric' ? (
                <View style={styles.inputBox}>
                  <TextInput
                    value={heightCm}
                    onChangeText={setHeightCm}
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                  <Text style={styles.inputUnit}>cm</Text>
                </View>
              ) : (
                <View style={styles.ftInRow}>
                  <View style={[styles.inputBox, { flex: 1 }]}>
                    <TextInput
                      value={heightFeet}
                      onChangeText={setHeightFeet}
                      keyboardType="numeric"
                      style={styles.textInput}
                    />
                    <Text style={styles.inputUnit}>ft</Text>
                  </View>
                  <View style={[styles.inputBox, { flex: 1 }]}>
                    <TextInput
                      value={heightInches}
                      onChangeText={setHeightInches}
                      keyboardType="numeric"
                      style={styles.textInput}
                    />
                    <Text style={styles.inputUnit}>in</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* Step 3: Activity & Step Count */}
          {step === 3 && (
            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.stepTitle}>Daily activity level</Text>
              <Text style={styles.stepSubtitle}>
                Select the option matching your daily step count and workout frequency.
              </Text>

              <View style={styles.optionsList}>
                {ACTIVITY_LIST.map((act) => {
                  const isSelected = activity === act.id;
                  const Icon = act.icon;
                  return (
                    <TouchableOpacity
                      key={act.id}
                      style={[styles.goalCard, isSelected && styles.goalCardSelected]}
                      onPress={() => setActivity(act.id)}
                      activeOpacity={0.8}>
                      <View style={styles.goalCardTop}>
                        <View style={styles.goalCardIconBox}>
                          <Icon size={18} color={isSelected ? PALETTE[950] : PALETTE[600]} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.goalTitleRow}>
                            <Text style={styles.goalTitle}>{act.title}</Text>
                            <Text style={styles.stepsBadge}>{act.steps}</Text>
                          </View>
                          <Text style={styles.goalDesc}>{act.desc}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Step 4: Plan Calculation Summary */}
          {step === 4 && (
            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.stepTitle}>Your personalized plan</Text>
              <Text style={styles.stepSubtitle}>
                Formulated using the clinical Mifflin-St Jeor equation and evidence-based sports macronutrient ratios.
              </Text>

              {/* Main Plan Card */}
              <View style={styles.planCard}>
                <View style={styles.planCardHeader}>
                  <Text style={styles.planLabel}>DAILY CALORIE TARGET</Text>
                  <View style={styles.formulaPill}>
                    <Zap size={11} color={PALETTE[950]} />
                    <Text style={styles.formulaText}>Mifflin-St Jeor Engine</Text>
                  </View>
                </View>

                <View style={styles.calorieHighlightRow}>
                  <Text style={styles.planCalValue}>{plan.targetCalories}</Text>
                  <Text style={styles.planCalUnit}>kcal / day</Text>
                </View>

                <View style={styles.metabolicStatsRow}>
                  <View style={styles.metabolicStat}>
                    <Text style={styles.metaLabel}>BMR (Basal)</Text>
                    <Text style={styles.metaValue}>{plan.bmr} kcal</Text>
                  </View>
                  <View style={styles.metabolicDivider} />
                  <View style={styles.metabolicStat}>
                    <Text style={styles.metaLabel}>TDEE (Burn)</Text>
                    <Text style={styles.metaValue}>{plan.tdee} kcal</Text>
                  </View>
                  <View style={styles.metabolicDivider} />
                  <View style={styles.metabolicStat}>
                    <Text style={styles.metaLabel}>Adjustment</Text>
                    <Text style={[styles.metaValue, { color: plan.deficitOrSurplus < 0 ? PALETTE[700] : PALETTE[600] }]}>
                      {plan.deficitOrSurplus > 0 ? `+${plan.deficitOrSurplus}` : plan.deficitOrSurplus} kcal
                    </Text>
                  </View>
                </View>
              </View>

              {/* 3 Macro Cards */}
              <View style={styles.macroCardsRow}>
                <View style={[styles.macroPlanCard, { borderColor: PALETTE[200] }]}>
                  <Text style={[styles.macroPlanLabel, { color: PALETTE[700] }]}>PROTEIN</Text>
                  <Text style={styles.macroPlanGram}>{plan.macros.protein}g</Text>
                  <Text style={styles.macroPlanSub}>{plan.proteinPerKg}g per kg</Text>
                </View>

                <View style={[styles.macroPlanCard, { borderColor: PALETTE[200] }]}>
                  <Text style={[styles.macroPlanLabel, { color: PALETTE[500] }]}>CARBS</Text>
                  <Text style={styles.macroPlanGram}>{plan.macros.carbs}g</Text>
                  <Text style={styles.macroPlanSub}>Energy support</Text>
                </View>

                <View style={[styles.macroPlanCard, { borderColor: PALETTE[200] }]}>
                  <Text style={[styles.macroPlanLabel, { color: PALETTE[400] }]}>FATS</Text>
                  <Text style={styles.macroPlanGram}>{plan.macros.fats}g</Text>
                  <Text style={styles.macroPlanSub}>Hormone balance</Text>
                </View>
              </View>

              {/* Extra Stats */}
              <View style={styles.extraStatsCard}>
                <View style={styles.extraStatRow}>
                  <Info size={14} color={PALETTE[950]} />
                  <Text style={styles.extraStatText}>
                    Hydration Goal: <Text style={styles.extraStatBold}>{plan.dailyWaterMl} ml / day</Text> (~{Math.round(plan.dailyWaterMl / 250)} glasses)
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Footer Actions */}
          <View style={styles.footer}>
            {step > 1 ? (
              <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
                <ArrowLeft size={15} color={PALETTE[600]} />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            {step < 4 ? (
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                <Text style={styles.nextBtnText}>Continue</Text>
                <ArrowRight size={15} color={PALETTE[50]} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.finishBtn} onPress={handleNext} activeOpacity={0.85}>
                <Check size={16} color={PALETTE[50]} />
                <Text style={styles.finishBtnText}>Activate Plan</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 35, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: PALETTE[50],
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBrand: {
    fontFamily: FONTS.serif,
    fontSize: 17,
    fontWeight: '700',
    color: PALETTE[950],
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  progressBarBg: {
    height: 3,
    backgroundColor: PALETTE[100],
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: PALETTE[950],
    borderRadius: 2,
  },
  scrollBody: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    fontWeight: '700',
    color: PALETTE[950],
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  stepSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[600],
    lineHeight: 16,
    marginBottom: 16,
  },
  optionsList: {
    gap: 10,
  },
  goalCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  goalCardSelected: {
    borderColor: PALETTE[950],
    backgroundColor: PALETTE.white,
  },
  goalCardTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  goalCardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PALETTE[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  goalTitle: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[950],
  },
  badge: {
    backgroundColor: PALETTE[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeSelected: {
    backgroundColor: PALETTE[950],
  },
  badgeText: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '700',
    color: PALETTE[600],
  },
  badgeTextSelected: {
    color: PALETTE[50],
  },
  stepsBadge: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[600],
  },
  goalDesc: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    lineHeight: 15,
  },
  unitToggleRow: {
    flexDirection: 'row',
    backgroundColor: PALETTE[100],
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  unitBtnActive: {
    backgroundColor: PALETTE.white,
  },
  unitBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[600],
  },
  unitBtnTextActive: {
    color: PALETTE[950],
  },
  inputSectionLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '800',
    color: PALETTE[600],
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 8,
  },
  sexRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  sexBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.white,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  sexBtnActive: {
    borderColor: PALETTE[950],
  },
  sexLabel: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[600],
  },
  sexLabelActive: {
    color: PALETTE[950],
  },
  inputsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  gridItem: {
    flex: 1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PALETTE.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  textInput: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE[950],
    padding: 0,
    flex: 1,
  },
  inputUnit: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[400],
  },
  ftInRow: {
    flexDirection: 'row',
    gap: 8,
  },
  planCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '800',
    color: PALETTE[600],
    letterSpacing: 1,
  },
  formulaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  formulaText: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '700',
    color: PALETTE[950],
  },
  calorieHighlightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  planCalValue: {
    fontFamily: FONTS.serif,
    fontSize: 34,
    fontWeight: '700',
    color: PALETTE[950],
    letterSpacing: -1,
  },
  planCalUnit: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    fontWeight: '600',
    color: PALETTE[600],
  },
  metabolicStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PALETTE[50],
    borderRadius: 10,
    padding: 10,
  },
  metabolicStat: {
    alignItems: 'center',
    flex: 1,
  },
  metaLabel: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    color: PALETTE[600],
    fontWeight: '600',
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: FONTS.serif,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[950],
  },
  metabolicDivider: {
    width: 1,
    height: 20,
    backgroundColor: PALETTE[100],
  },
  macroCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  macroPlanCard: {
    flex: 1,
    backgroundColor: PALETTE.white,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  macroPlanLabel: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  macroPlanGram: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE[950],
    marginBottom: 2,
  },
  macroPlanSub: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    color: PALETTE[600],
    lineHeight: 11,
  },
  extraStatsCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  extraStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  extraStatText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    flex: 1,
  },
  extraStatBold: {
    fontWeight: '700',
    color: PALETTE[950],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: PALETTE[100],
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[600],
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PALETTE[950],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  nextBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[50],
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PALETTE[950],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  finishBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[50],
  },
});
