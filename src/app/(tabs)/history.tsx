import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Drumstick,
  Wheat,
  Droplet,
} from 'lucide-react-native';
import { useNutrition } from '@/context/NutritionContext';
import { MealCard } from '@/components/MealCard';
import { MealResultModal } from '@/components/MealResultModal';
import { formatDateLabel, getTodayDateString } from '@/services/storage';
import { MealType, AiFoodDetectionResult, FoodEntry } from '@/types/nutrition';
import { PALETTE, FONTS } from '@/constants/theme';

export default function HistoryScreen() {
  const router = useRouter();
  const {
    entries,
    selectedDate,
    setSelectedDate,
    goals,
    stats,
    logMeal,
    editMeal,
    removeMeal,
  } = useNutrition();

  const [activeTab, setActiveTab] = useState<'calendar' | 'groups'>('calendar');
  const [modalVisible, setModalVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>('lunch');
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [sampleResult, setSampleResult] = useState<AiFoodDetectionResult | null>(null);

  const currentDateObj = new Date(`${selectedDate}T12:00:00`);

  const handlePrevDay = () => {
    const prev = new Date(currentDateObj);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const next = new Date(currentDateObj);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  // Generate 7-day strip centered around selected date
  const dateStrip = React.useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const centerDate = new Date(year, month - 1, day);

    const strip = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(centerDate);
      d.setDate(centerDate.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayStr}`;

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();

      const dayEntries = entries.filter((e) => e.date === dateStr);
      const dayCal = dayEntries.reduce((sum, e) => sum + (Number(e.calories) || 0), 0);

      strip.push({
        dateStr,
        dayName,
        dayNum,
        dayCal,
        isToday: dateStr === getTodayDateString(),
        isSelected: dateStr === selectedDate,
      });
    }
    return strip;
  }, [entries, selectedDate]);

  // Group entries for this date
  const dayEntries = entries.filter((e) => e.date === selectedDate);
  const breakfastEntries = dayEntries.filter((e) => e.mealType === 'breakfast');
  const lunchEntries = dayEntries.filter((e) => e.mealType === 'lunch');
  const dinnerEntries = dayEntries.filter((e) => e.mealType === 'dinner');
  const snackEntries = dayEntries.filter((e) => e.mealType === 'snack');

  const totalDayCalories = dayEntries.reduce((sum, e) => sum + (Number(e.calories) || 0), 0);
  const totalDayProtein = dayEntries.reduce((sum, e) => sum + (Number(e.protein) || 0), 0);
  const totalDayCarbs = dayEntries.reduce((sum, e) => sum + (Number(e.carbs) || 0), 0);
  const totalDayFats = dayEntries.reduce((sum, e) => sum + (Number(e.fats) || 0), 0);

  const isGoalMet =
    totalDayCalories >= goals.calories * 0.85 && totalDayCalories <= goals.calories * 1.15;

  const handleCopyDayToToday = async () => {
    const today = getTodayDateString();
    for (const entry of dayEntries) {
      await logMeal({
        name: entry.name,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fats: entry.fats,
        mealType: entry.mealType,
        portionSize: entry.portionSize,
        imageUri: entry.imageUri,
        date: today,
        isAiGenerated: false,
      });
    }
    setSelectedDate(today);
  };

  const handleOpenAdd = (type: MealType) => {
    setEditingEntry(null);
    setActiveMealType(type);
    setSampleResult({
      foodName: 'Balanced Healthy Meal',
      calories: 450,
      protein: 32,
      carbs: 42,
      fats: 16,
      servingSize: '1 plate',
      confidence: 0.95,
      breakdown: [{ item: 'Protein item', portion: '1 plate', calories: 450 }],
    });
    setModalVisible(true);
  };

  const handleOpenEdit = (entry: FoodEntry) => {
    setEditingEntry(entry);
    setSampleResult(null);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header with Tab Switcher */}
      <View style={styles.header}>
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.switchTab, activeTab === 'calendar' && styles.switchTabActive]}
            onPress={() => setActiveTab('calendar')}>
            <Text style={[styles.switchTabText, activeTab === 'calendar' && styles.switchTabTextActive]}>
              Calendar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchTab, activeTab === 'groups' && styles.switchTabActive]}
            onPress={() => setActiveTab('groups')}>
            <Text style={[styles.switchTabText, activeTab === 'groups' && styles.switchTabTextActive]}>
              Community Groups
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.todayButton}
          onPress={() => setSelectedDate(getTodayDateString())}>
          <CalendarIcon size={13} color={PALETTE[950]} />
          <Text style={styles.todayBtnText}>Today</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'groups' ? (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Groups Hero Card */}
          <View style={styles.groupHeroCard}>
            <View style={styles.groupHeroLeft}>
              <Text style={styles.groupHeroTitle}>Streak Challenges</Text>
              <Text style={styles.groupHeroSub}>Compete with friends & stay accountable together</Text>
            </View>
            <Trophy size={28} color={PALETTE[700]} />
          </View>

          {/* Group 1 */}
          <View style={styles.communityCard}>
            <View style={styles.commTop}>
              <View style={styles.commAvatar}>
                <Text style={{ fontSize: 16 }}>🎯</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.commName}>10k Steps & Clean Eating</Text>
                <Text style={styles.commSub}>1,420 members • 84% active today</Text>
              </View>
              <View style={styles.joinedBadge}>
                <Text style={styles.joinedText}>Joined</Text>
              </View>
            </View>
          </View>

          {/* Group 2 */}
          <View style={styles.communityCard}>
            <View style={styles.commTop}>
              <View style={styles.commAvatar}>
                <Text style={{ fontSize: 16 }}>⚡</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.commName}>High Protein Bulk & Cut</Text>
                <Text style={styles.commSub}>3,850 members • 91% active today</Text>
              </View>
              <View style={styles.joinedBadge}>
                <Text style={styles.joinedText}>Joined</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <>
          {/* Date Navigator Header */}
          <View style={styles.dateNavigator}>
            <TouchableOpacity onPress={handlePrevDay} style={styles.navArrowBtn}>
              <ChevronLeft size={18} color={PALETTE[950]} />
            </TouchableOpacity>

            <View style={styles.dateDisplay}>
              <Text style={styles.dateMainText}>{formatDateLabel(selectedDate)}</Text>
              <Text style={styles.dateSubText}>{selectedDate}</Text>
            </View>

            <TouchableOpacity onPress={handleNextDay} style={styles.navArrowBtn}>
              <ChevronRight size={18} color={PALETTE[950]} />
            </TouchableOpacity>
          </View>

          {/* Horizontal Date Strip */}
          <View style={styles.stripContainer}>
            {dateStrip.map((item) => (
              <TouchableOpacity
                key={item.dateStr}
                style={[styles.stripItem, item.isSelected && styles.stripItemSelected]}
                onPress={() => setSelectedDate(item.dateStr)}>
                <Text style={[styles.stripDayName, item.isSelected && styles.stripDayNameSelected]}>
                  {item.dayName}
                </Text>
                <Text style={[styles.stripDayNum, item.isSelected && styles.stripDayNumSelected]}>
                  {item.dayNum}
                </Text>
                <View
                  style={[
                    styles.stripDot,
                    item.dayCal > 0 ? styles.stripDotActive : styles.stripDotInactive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Day Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.summaryLabel}>LOCKED DAILY TOTALS</Text>
                  <Text style={styles.summaryCalories}>
                    {totalDayCalories}{' '}
                    <Text style={styles.summaryGoal}>/ {goals.calories} kcal</Text>
                  </Text>
                </View>

                <View
                  style={[
                    styles.goalStatusBadge,
                    isGoalMet ? styles.goalStatusMet : styles.goalStatusMissed,
                  ]}>
                  {isGoalMet ? (
                    <>
                      <CheckCircle2 size={12} color={PALETTE[600]} />
                      <Text style={styles.goalStatusMetText}>Goal Met</Text>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} color={PALETTE[500]} />
                      <Text style={styles.goalStatusMissedText}>
                        {totalDayCalories > 0 ? 'Recorded' : 'Empty'}
                      </Text>
                    </>
                  )}
                </View>
              </View>

              {/* Macro Pills */}
              <View style={styles.macroPillsRow}>
                <View style={styles.macroPill}>
                  <View style={styles.macroPillHeader}>
                    <Drumstick size={11} color={PALETTE[700]} />
                    <Text style={[styles.macroPillLabel, { color: PALETTE[700] }]}>Protein</Text>
                  </View>
                  <Text style={styles.macroPillVal}>{totalDayProtein}g</Text>
                </View>
                <View style={styles.macroPill}>
                  <View style={styles.macroPillHeader}>
                    <Wheat size={11} color={PALETTE[500]} />
                    <Text style={[styles.macroPillLabel, { color: PALETTE[500] }]}>Carbs</Text>
                  </View>
                  <Text style={styles.macroPillVal}>{totalDayCarbs}g</Text>
                </View>
                <View style={styles.macroPill}>
                  <View style={styles.macroPillHeader}>
                    <Droplet size={11} color={PALETTE[400]} />
                    <Text style={[styles.macroPillLabel, { color: PALETTE[400] }]}>Fats</Text>
                  </View>
                  <Text style={styles.macroPillVal}>{totalDayFats}g</Text>
                </View>
              </View>

              {/* Copy To Today Action (if non-today with entries) */}
              {selectedDate !== getTodayDateString() && dayEntries.length > 0 && (
                <TouchableOpacity
                  style={styles.copyToTodayBtn}
                  onPress={handleCopyDayToToday}
                  activeOpacity={0.85}>
                  <Text style={styles.copyToTodayBtnText}>
                    ⚡ Copy all {dayEntries.length} meals from this day to Today
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Meal Logs for Selected Date */}
            <MealCard
              type="breakfast"
              title="Breakfast"
              entries={breakfastEntries}
              onAddPress={handleOpenAdd}
              onEditEntry={handleOpenEdit}
              onDeleteEntry={removeMeal}
            />

            <MealCard
              type="lunch"
              title="Lunch"
              entries={lunchEntries}
              onAddPress={handleOpenAdd}
              onEditEntry={handleOpenEdit}
              onDeleteEntry={removeMeal}
            />

            <MealCard
              type="dinner"
              title="Dinner"
              entries={dinnerEntries}
              onAddPress={handleOpenAdd}
              onEditEntry={handleOpenEdit}
              onDeleteEntry={removeMeal}
            />

            <MealCard
              type="snack"
              title="Snacks"
              entries={snackEntries}
              onAddPress={handleOpenAdd}
              onEditEntry={handleOpenEdit}
              onDeleteEntry={removeMeal}
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}

      {/* Manual Quick Add / Adjustment Modal */}
      <MealResultModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingEntry(null);
        }}
        result={sampleResult}
        editingEntry={editingEntry}
        defaultMealType={activeMealType}
        onDeleteEntry={removeMeal}
        onConfirm={(item) => {
          if (item.id) {
            editMeal({
              id: item.id,
              name: item.name,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fats: item.fats,
              mealType: item.mealType,
              portionSize: item.portionSize,
              imageUri: item.imageUri,
              timestamp: editingEntry?.timestamp || new Date().toISOString(),
              date: selectedDate,
              isAiGenerated: editingEntry?.isAiGenerated,
            });
          } else {
            logMeal({
              name: item.name,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fats: item.fats,
              mealType: item.mealType,
              portionSize: item.portionSize,
              imageUri: item.imageUri,
              date: selectedDate,
              isAiGenerated: false,
            });
          }
        }}
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
    paddingVertical: 12,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: PALETTE[100],
    borderRadius: 12,
    padding: 3,
  },
  switchTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  switchTabActive: {
    backgroundColor: PALETTE.white,
  },
  switchTabText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE[600],
  },
  switchTabTextActive: {
    color: PALETTE[950],
    fontWeight: '700',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  todayBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[950],
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  dateDisplay: {
    alignItems: 'center',
  },
  dateMainText: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE[950],
  },
  dateSubText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[400],
    marginTop: 1,
  },
  stripContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  stripItem: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: PALETTE.white,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  stripItemSelected: {
    borderColor: PALETTE[950],
    backgroundColor: PALETTE[950],
  },
  stripDayName: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '700',
    color: PALETTE[400],
  },
  stripDayNameSelected: {
    color: PALETTE[200],
  },
  stripDayNum: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
    marginVertical: 1,
  },
  stripDayNumSelected: {
    color: PALETTE[50],
  },
  stripDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  stripDotActive: {
    backgroundColor: PALETTE[600],
  },
  stripDotInactive: {
    backgroundColor: PALETTE[100],
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  summaryCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  summaryLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[600],
    letterSpacing: 0.8,
  },
  summaryCalories: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    fontWeight: '700',
    color: PALETTE[950],
    marginTop: 2,
  },
  summaryGoal: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE[400],
  },
  goalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  goalStatusMet: {
    backgroundColor: PALETTE[100],
  },
  goalStatusMetText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[700],
  },
  goalStatusMissed: {
    backgroundColor: PALETTE[50],
  },
  goalStatusMissedText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[500],
  },
  macroPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroPill: {
    flex: 1,
    backgroundColor: PALETTE[50],
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  macroPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroPillLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
  },
  macroPillVal: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[950],
    marginTop: 2,
  },
  copyToTodayBtn: {
    backgroundColor: PALETTE[100],
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  copyToTodayBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[800],
  },
  groupHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  groupHeroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  groupHeroTitle: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE[950],
  },
  groupHeroSub: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[600],
    marginTop: 2,
  },
  communityCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  commTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PALETTE[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  commName: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[950],
  },
  commSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[400],
    marginTop: 2,
  },
  joinedBadge: {
    backgroundColor: PALETTE[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  joinedText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[950],
  },
});
