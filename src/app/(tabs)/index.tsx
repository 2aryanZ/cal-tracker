import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Flame,
  Droplet,
  Plus,
  Zap,
  Camera,
  QrCode,
  Mic,
  ChefHat,
  Star,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import { useNutrition } from '@/context/NutritionContext';
import { CalorieRing } from '@/components/CalorieRing';
import { MacroMiniCard } from '@/components/MacroMiniCard';
import { MealCard } from '@/components/MealCard';
import { MealResultModal } from '@/components/MealResultModal';
import { AiCoachCard } from '@/components/AiCoachCard';
import { VoiceLogModal } from '@/components/VoiceLogModal';
import { MealPlanModal } from '@/components/MealPlanModal';
import { getTodayDateString } from '@/services/storage';
import { MealType, AiFoodDetectionResult, FoodEntry, AiMealPlanItem, AiMealPlan } from '@/types/nutrition';
import { PALETTE, FONTS } from '@/constants/theme';
import { triggerLightImpact, triggerSelection, triggerSuccessFeedback } from '@/services/hapticsService';

export default function HomeScreen() {
  const router = useRouter();
  const {
    entries,
    selectedDate,
    setSelectedDate,
    goals,
    stats,
    consumed,
    remaining,
    waterMl,
    favoriteMeals,
    dietaryPreference,
    logWater,
    logMeal,
    editMeal,
    removeMeal,
    refreshData,
  } = useNutrition();

  const [modalVisible, setModalVisible] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isMealPlanModalOpen, setIsMealPlanModalOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>('lunch');
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [sampleResult, setSampleResult] = useState<AiFoodDetectionResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | MealType>('all');
  const waterTarget = goals.waterMl || 2000;


  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  // Generate 7-day calendar strip
  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);

    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();

      list.push({
        dateStr,
        dayName,
        dayNum,
        isToday: dateStr === getTodayDateString(),
        isSelected: dateStr === selectedDate,
      });
    }
    return list;
  }, [selectedDate]);

  // Single-pass partitioning of entries for active date (O(N) vs 5x iterations)
  const { dateEntries, breakfastEntries, lunchEntries, dinnerEntries, snackEntries } = useMemo(() => {
    const allDate: FoodEntry[] = [];
    const b: FoodEntry[] = [];
    const l: FoodEntry[] = [];
    const d: FoodEntry[] = [];
    const s: FoodEntry[] = [];

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.date === selectedDate) {
        allDate.push(e);
        if (e.mealType === 'breakfast') b.push(e);
        else if (e.mealType === 'lunch') l.push(e);
        else if (e.mealType === 'dinner') d.push(e);
        else if (e.mealType === 'snack') s.push(e);
      }
    }

    return {
      dateEntries: allDate,
      breakfastEntries: b,
      lunchEntries: l,
      dinnerEntries: d,
      snackEntries: s,
    };
  }, [entries, selectedDate]);

  const handleOpenAdd = useCallback((type: MealType) => {
    triggerLightImpact();
    setEditingEntry(null);
    setActiveMealType(type);
    setSampleResult({
      foodName: 'Caesar Salad with Cherry Tomatoes',
      calories: 330,
      protein: 8,
      carbs: 20,
      fats: 18,
      servingSize: '1 bowl',
      confidence: 0.96,
      breakdown: [
        { item: 'Lettuce', portion: '1.5 cups', calories: 20 },
        { item: 'Cherry Tomatoes', portion: '0.5 cup', calories: 30 },
        { item: 'Croutons & Parmesan', portion: '40g', calories: 180 },
        { item: 'Caesar Dressing', portion: '2 tbsp', calories: 100 },
      ],
    });
    setModalVisible(true);
  }, []);

  const handleOpenEdit = useCallback((entry: FoodEntry) => {
    triggerLightImpact();
    setEditingEntry(entry);
    setSampleResult(null);
    setModalVisible(true);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.fitnessBadge}>
            <Flame size={16} color="#10B981" fill="#10B981" />
          </View>
          <Text style={styles.appTitle}>Cal Tracker</Text>
        </View>

        <View style={styles.topRightRow}>
          <TouchableOpacity
            style={styles.streakPill}
            onPress={() => router.push('/(tabs)/analytics')}
            activeOpacity={0.8}>
            <Flame size={13} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.streakCount}>{stats.currentStreak} Day Streak</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Ribbon */}
      <View style={styles.dateRibbon}>
        {weekDays.map((item) => (
          <TouchableOpacity
            key={item.dateStr}
            style={styles.dayColumn}
            onPress={() => {
              triggerSelection();
              setSelectedDate(item.dateStr);
            }}
            activeOpacity={0.7}>
            <Text style={styles.dayNameText}>{item.dayName}</Text>
            <View
              style={[
                styles.dayNumCircle,
                item.isSelected && styles.dayNumCircleSelected,
                item.isToday && !item.isSelected && styles.dayNumCircleToday,
              ]}>
              <Text
                style={[
                  styles.dayNumText,
                  item.isSelected && styles.dayNumTextSelected,
                ]}>
                {item.dayNum}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PALETTE[950]}
            colors={[PALETTE[950]]}
          />
        }>
        {/* 1. Personalized AI Coach Card */}
        <AiCoachCard
          onActionPress={(rec) => {
            logMeal({
              name: rec.name,
              calories: rec.calories,
              protein: rec.protein,
              carbs: rec.carbs,
              fats: rec.fats,
              mealType: rec.mealType,
              portionSize: '1 serving',
              isAiGenerated: false,
            });
          }}
          onOpenScanner={() => router.push('/(tabs)/scan')}
        />

        {/* 2. Primary Hero AI Food Scanner Action Card */}
        <View style={styles.primaryScanHeroCard}>
          <View style={styles.scanHeroTopRow}>
            <View style={styles.scanHeroLeft}>
              <View style={styles.scanHeroBadge}>
                <Sparkles size={10} color={PALETTE[50]} />
                <Text style={styles.scanHeroBadgeText}>Instant Gemini Vision</Text>
              </View>
              <Text style={styles.scanHeroTitle}>AI Food Scanner</Text>
              <Text style={styles.scanHeroSub}>
                Point camera at any meal to extract exact calories, macros & ingredients
              </Text>
            </View>

            <TouchableOpacity
              style={styles.scanLaunchCameraBtn}
              onPress={() => {
                triggerLightImpact();
                router.push('/(tabs)/scan');
              }}
              activeOpacity={0.85}>
              <Camera size={26} color={PALETTE[950]} />
              <Text style={styles.scanLaunchCameraText}>Scan</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Shortcuts: Barcode Scan, Voice Log, AI Meal Plan */}
          <View style={styles.scanShortcutsRow}>
            <TouchableOpacity
              style={styles.scanShortcutItem}
              onPress={() => {
                triggerLightImpact();
                router.push('/(tabs)/scan');
              }}
              activeOpacity={0.8}>
              <QrCode size={13} color="#10B981" />
              <Text style={styles.scanShortcutText}>Barcode</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scanShortcutItem}
              onPress={() => {
                triggerLightImpact();
                setIsVoiceModalOpen(true);
              }}
              activeOpacity={0.8}>
              <Mic size={13} color="#EC4899" />
              <Text style={styles.scanShortcutText}>Voice Log</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scanShortcutItem}
              onPress={() => {
                triggerLightImpact();
                setIsMealPlanModalOpen(true);
              }}
              activeOpacity={0.8}>
              <ChefHat size={13} color="#3B82F6" />
              <Text style={styles.scanShortcutText}>Meal Plan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Main Calorie Hero Card (1250 / 2500 Calories eaten + circular ring) */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <View style={styles.heroCalRow}>
              <Text style={styles.heroCalConsumed}>{consumed.calories}</Text>
              <Text style={styles.heroCalTarget}>/{goals.calories}</Text>
            </View>
            <View style={styles.heroSubRow}>
              <Text style={styles.heroCalSubtitle}>Calories eaten</Text>
              <View style={styles.remainingPill}>
                <Text style={styles.remainingPillText}>
                  {remaining.calories > 0 ? `${remaining.calories} kcal left` : 'Goal reached! 🎉'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.heroRight}>
            <CalorieRing consumed={consumed.calories} goal={goals.calories} size={76} strokeWidth={6} />
          </View>
        </View>

        {/* 4. 3 Macro Mini Cards */}
        <View style={styles.macrosGrid}>
          <MacroMiniCard
            label="Protein"
            consumed={consumed.protein}
            target={goals.protein}
            type="protein"
          />
          <MacroMiniCard
            label="Carbs"
            consumed={consumed.carbs}
            target={goals.carbs}
            type="carbs"
          />
          <MacroMiniCard
            label="Fats"
            consumed={consumed.fats}
            target={goals.fats}
            type="fats"
          />
        </View>

        {/* 5. Favorites & Quick Log Shelf */}
        {favoriteMeals.length > 0 && (
          <View style={styles.favoritesShelf}>
            <View style={styles.favoritesHeaderRow}>
              <View style={styles.favoritesTitleRow}>
                <Star size={13} color="#D97706" fill="#D97706" />
                <Text style={styles.favoritesTitle}>Favorites & Quick Log</Text>
              </View>
              <Text style={styles.favoritesSub}>1-Tap to add to {activeMealType}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favoritesScroll}>
              {favoriteMeals.map((fav) => (
                <TouchableOpacity
                  key={fav.id}
                  style={styles.favoriteChip}
                  onPress={() => {
                    triggerSuccessFeedback();
                    logMeal({
                      name: fav.name,
                      calories: fav.calories,
                      protein: fav.protein,
                      carbs: fav.carbs,
                      fats: fav.fats,
                      mealType: fav.mealType || activeMealType,
                      portionSize: fav.portionSize,
                      imageUri: fav.imageUri,
                      isAiGenerated: false,
                    });
                  }}
                  activeOpacity={0.8}>
                  <View>
                    <Text style={styles.favChipName} numberOfLines={1}>{fav.name}</Text>
                    <Text style={styles.favChipSub}>+{fav.calories} kcal • {fav.protein}g P</Text>
                  </View>
                  <Plus size={12} color={PALETTE[950]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 6. Daily Caloric Energy & Deficit Insight */}
        <View style={styles.energyInsightCard}>
          <View style={styles.energyInsightLeft}>
            <View style={styles.energyIconBadge}>
              <Zap size={14} color="#059669" />
            </View>
            <View>
              <Text style={styles.energyTitle}>
                {remaining.calories > 0
                  ? `${remaining.calories} kcal remaining`
                  : 'Energy Target Met! 🎯'}
              </Text>
              <Text style={styles.energySubtitle}>
                {remaining.calories > 0
                  ? 'Keep fueling clean to hit your metabolic daily deficit.'
                  : 'Perfect energy balance locked in for the day.'}
              </Text>
            </View>
          </View>
        </View>

        {/* 7. Daily Hydration Quick-Log Card */}
        <View style={styles.waterCard}>
          <View style={styles.waterHeaderRow}>
            <View style={styles.waterTitleRow}>
              <Droplet size={16} color="#0284C7" fill="#0284C7" />
              <Text style={styles.waterTitle}>Daily Hydration</Text>
            </View>
            <Text style={styles.waterAmountText}>
              {(waterMl / 1000).toFixed(2)}L <Text style={styles.waterTargetText}>/ {(waterTarget / 1000).toFixed(1)}L</Text>
            </Text>
          </View>

          <View style={styles.waterProgressTrack}>
            <View
              style={[
                styles.waterProgressFill,
                { width: `${Math.min(100, Math.round((waterMl / waterTarget) * 100))}%` },
              ]}
            />
          </View>

          <View style={styles.waterQuickBtnsRow}>
            <TouchableOpacity
              style={styles.waterQuickBtn}
              onPress={() => {
                triggerLightImpact();
                logWater(250);
              }}
              activeOpacity={0.8}>
              <Plus size={12} color="#0284C7" />
              <Text style={styles.waterQuickBtnText}>+250 ml (Glass)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.waterQuickBtn}
              onPress={() => {
                triggerLightImpact();
                logWater(500);
              }}
              activeOpacity={0.8}>
              <Plus size={12} color="#0284C7" />
              <Text style={styles.waterQuickBtnText}>+500 ml (Bottle)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.waterQuickBtn, { flex: 0.65, backgroundColor: 'rgba(2, 132, 199, 0.08)' }]}
              onPress={() => {
                triggerLightImpact();
                logWater(-250);
              }}
              activeOpacity={0.8}>
              <Text style={[styles.waterQuickBtnText, { color: '#0284C7' }]}>-250 ml</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Meal Category Filter Pills */}
        <View style={styles.filterPillsRow}>
          {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterPill,
                selectedCategoryFilter === cat && styles.filterPillActive,
              ]}
              onPress={() => {
                triggerSelection();
                setSelectedCategoryFilter(cat);
              }}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.filterPillText,
                  selectedCategoryFilter === cat && styles.filterPillTextActive,
                ]}>
                {cat === 'all'
                  ? `All (${dateEntries.length})`
                  : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Meal Categories */}
        {(selectedCategoryFilter === 'all' || selectedCategoryFilter === 'breakfast') && (
          <MealCard
            type="breakfast"
            title="Breakfast"
            entries={breakfastEntries}
            onAddPress={handleOpenAdd}
            onEditEntry={handleOpenEdit}
            onDeleteEntry={removeMeal}
          />
        )}

        {(selectedCategoryFilter === 'all' || selectedCategoryFilter === 'lunch') && (
          <MealCard
            type="lunch"
            title="Lunch"
            entries={lunchEntries}
            onAddPress={handleOpenAdd}
            onEditEntry={handleOpenEdit}
            onDeleteEntry={removeMeal}
          />
        )}

        {(selectedCategoryFilter === 'all' || selectedCategoryFilter === 'dinner') && (
          <MealCard
            type="dinner"
            title="Dinner"
            entries={dinnerEntries}
            onAddPress={handleOpenAdd}
            onEditEntry={handleOpenEdit}
            onDeleteEntry={removeMeal}
          />
        )}

        {(selectedCategoryFilter === 'all' || selectedCategoryFilter === 'snack') && (
          <MealCard
            type="snack"
            title="Snacks"
            entries={snackEntries}
            onAddPress={handleOpenAdd}
            onEditEntry={handleOpenEdit}
            onDeleteEntry={removeMeal}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Voice Log Modal */}
      <VoiceLogModal
        visible={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        defaultMealType={activeMealType}
        onConfirm={(parsed, slot) => {
          logMeal({
            name: parsed.foodName,
            calories: parsed.calories,
            protein: parsed.protein,
            carbs: parsed.carbs,
            fats: parsed.fats,
            mealType: slot,
            portionSize: parsed.servingSize,
            isAiGenerated: true,
          });
        }}
      />

      {/* AI Meal Plan Modal */}
      <MealPlanModal
        visible={isMealPlanModalOpen}
        onClose={() => setIsMealPlanModalOpen(false)}
        goals={goals}
        currentPreference={dietaryPreference}
        onLogMealItem={(item: AiMealPlanItem) => {
          logMeal({
            name: item.name,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            mealType: item.mealType,
            portionSize: item.portionSize,
            isAiGenerated: false,
          });
        }}
        onApplyFullPlan={(plan: AiMealPlan) => {
          for (const m of plan.meals) {
            logMeal({
              name: m.name,
              calories: m.calories,
              protein: m.protein,
              carbs: m.carbs,
              fats: m.fats,
              mealType: m.mealType,
              portionSize: m.portionSize,
              isAiGenerated: false,
            });
          }
        }}
      />

      {/* Result / Adjustment Sheet */}
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
              timestamp: new Date().toISOString(),
              date: selectedDate,
              imageUri: item.imageUri,
              isAiGenerated: false,
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
              isAiGenerated: false,
            });
          }
          setModalVisible(false);
          setEditingEntry(null);
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appTitle: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    fontWeight: '700',
    color: PALETTE[950],
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE[100],
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakCount: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[700],
  },
  dateRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 6,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  dayNameText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE[600],
  },
  dayNumCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayNumCircleToday: {
    backgroundColor: PALETTE[100],
  },
  dayNumCircleSelected: {
    backgroundColor: PALETTE[950],
  },
  dayNumText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[900],
  },
  dayNumTextSelected: {
    color: PALETTE[50],
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  primaryScanHeroCard: {
    backgroundColor: PALETTE[900],
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  scanHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scanHeroLeft: {
    flex: 1,
    marginRight: 10,
  },
  scanHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(218, 237, 235, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  scanHeroBadgeText: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '700',
    color: PALETTE[50],
  },
  scanHeroTitle: {
    fontFamily: FONTS.serif,
    fontSize: 17,
    fontWeight: '700',
    color: PALETTE[50],
  },
  scanHeroSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[200],
    lineHeight: 15,
    marginTop: 2,
  },
  scanLaunchCameraBtn: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  scanLaunchCameraText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '800',
    color: PALETTE[950],
    marginTop: 2,
  },
  scanShortcutsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(218, 237, 235, 0.12)',
    paddingTop: 10,
  },
  scanShortcutItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(218, 237, 235, 0.12)',
    paddingVertical: 7,
    borderRadius: 8,
  },
  scanShortcutText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[50],
  },
  favoritesShelf: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  favoritesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  favoritesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  favoritesTitle: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  favoritesSub: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[500],
  },
  favoritesScroll: {
    gap: 8,
  },
  favoriteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PALETTE[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  favChipName: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[950],
    maxWidth: 140,
  },
  favChipSub: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    color: PALETTE[600],
  },
  heroCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  heroLeft: {
    gap: 4,
    flex: 1,
  },
  heroCalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroCalConsumed: {
    fontFamily: FONTS.serif,
    fontSize: 32,
    fontWeight: '700',
    color: PALETTE[950],
    letterSpacing: -0.5,
  },
  heroCalTarget: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    color: PALETTE[400],
    fontWeight: '600',
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  heroCalSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[600],
  },
  remainingPill: {
    backgroundColor: PALETTE[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  remainingPillText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[700],
  },
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: PALETTE.white,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  filterPillActive: {
    backgroundColor: PALETTE[950],
    borderColor: PALETTE[950],
  },
  filterPillText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE[600],
  },
  filterPillTextActive: {
    color: PALETTE[50],
    fontWeight: '700',
  },
  fitnessBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  energyInsightCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  energyInsightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  energyIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyTitle: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  energySubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  waterCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: PALETTE[100],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  waterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  waterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waterTitle: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  waterAmountText: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  waterTargetText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[400],
    fontWeight: '500',
  },
  waterProgressTrack: {
    height: 6,
    backgroundColor: '#F0F9FF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  waterProgressFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 4,
  },
  waterQuickBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  waterQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  waterQuickBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
});
