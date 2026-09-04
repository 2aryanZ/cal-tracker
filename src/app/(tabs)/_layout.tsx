import React, { useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import {
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import {
  Home,
  BarChart2,
  Users,
  User,
  Plus,
} from 'lucide-react-native';
import { PALETTE, FONTS } from '@/constants/theme';
import { triggerSelection, triggerMediumImpact, triggerLightImpact } from '@/services/hapticsService';
import { useNutrition } from '@/context/NutritionContext';
import { WeightLogModal } from '@/components/WeightLogModal';
import { MealResultModal } from '@/components/MealResultModal';
import { QuickActionHubModal } from '@/components/QuickActionHubModal';
import { VoiceLogModal } from '@/components/VoiceLogModal';
import { MealPlanModal } from '@/components/MealPlanModal';
import { getTodayDateString } from '@/services/storage';
import { MealType, AiMealPlanItem, AiMealPlan } from '@/types/nutrition';

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  onPlusPress: () => void;
}

function CustomTabBar({ state, navigation, onPlusPress }: CustomTabBarProps) {
  const router = useRouter();

  const getIcon = (name: string, isFocused: boolean) => {
    const color = isFocused ? PALETTE[950] : PALETTE[400];
    const strokeWidth = isFocused ? 2.2 : 1.8;

    switch (name) {
      case 'index':
        return <Home size={20} color={color} strokeWidth={strokeWidth} />;
      case 'analytics':
        return <BarChart2 size={20} color={color} strokeWidth={strokeWidth} />;
      case 'history':
        return <Users size={20} color={color} strokeWidth={strokeWidth} />;
      case 'scan':
        return <User size={20} color={color} strokeWidth={strokeWidth} />;
      default:
        return <Home size={20} color={color} strokeWidth={strokeWidth} />;
    }
  };

  const getLabel = (name: string) => {
    switch (name) {
      case 'index':
        return 'Home';
      case 'analytics':
        return 'Progress';
      case 'history':
        return 'Groups';
      case 'scan':
        return 'Profile';
      default:
        return name;
    }
  };

  return (
    <View style={styles.tabBarContainer}>
      {/* 4 Tabs on Left */}
      <View style={styles.tabsRow}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const onPress = () => {
            triggerSelection();
            if (route.name === 'scan') {
              router.push('/settings');
              return;
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.7}>
              <View style={styles.iconBox}>{getIcon(route.name, isFocused)}</View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>
                {getLabel(route.name)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Floating Squircle Plus Button Docked on Right */}
      <View style={styles.plusContainer}>
        <TouchableOpacity
          style={styles.plusButton}
          onPress={() => {
            triggerMediumImpact();
            onPlusPress();
          }}
          activeOpacity={0.85}>
          <Plus size={22} color={PALETTE.white} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const { userProfile, goals, dietaryPreference, addWeight, logMeal, selectedDate } = useNutrition();

  const [isActionHubOpen, setIsActionHubOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isMealPlanModalOpen, setIsMealPlanModalOpen] = useState(false);

  const handleSaveWeight = async (data: {
    weightKg: number;
    weightLbs: number;
    date: string;
    note?: string;
  }) => {
    await addWeight(data);
  };

  const handleSaveManualMeal = (item: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    mealType: MealType;
    portionSize: string;
    imageUri?: string;
  }) => {
    logMeal({
      name: item.name || 'Quick Logged Meal',
      calories: item.calories || 450,
      protein: item.protein || 30,
      carbs: item.carbs || 45,
      fats: item.fats || 15,
      mealType: item.mealType || 'lunch',
      portionSize: item.portionSize || '1 serving',
      imageUri: item.imageUri,
      date: selectedDate || getTodayDateString(),
      isAiGenerated: false,
    });
    setIsMealModalOpen(false);
  };

  const handleActionHubSelect = (action: 'scan_food' | 'barcode' | 'voice_log' | 'meal_plan' | 'log_weight' | 'quick_meal') => {
    switch (action) {
      case 'scan_food':
      case 'barcode':
        router.push('/(tabs)/scan');
        break;
      case 'voice_log':
        setIsVoiceModalOpen(true);
        break;
      case 'meal_plan':
        setIsMealPlanModalOpen(true);
        break;
      case 'log_weight':
        setIsWeightModalOpen(true);
        break;
      case 'quick_meal':
        setIsMealModalOpen(true);
        break;
    }
  };

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar {...props} onPlusPress={() => setIsActionHubOpen(true)} />
        )}
        screenOptions={{
          headerShown: false,
        }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="analytics" options={{ title: 'Progress' }} />
        <Tabs.Screen name="history" options={{ title: 'Groups' }} />
        <Tabs.Screen name="scan" options={{ title: 'Profile' }} />
      </Tabs>

      {/* Quick Actions Hub Modal */}
      <QuickActionHubModal
        visible={isActionHubOpen}
        onClose={() => setIsActionHubOpen(false)}
        onSelectAction={handleActionHubSelect}
      />

      {/* Voice Log Modal */}
      <VoiceLogModal
        visible={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        defaultMealType="lunch"
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

      {/* Interactive Weight Log Modal */}
      <WeightLogModal
        visible={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        currentWeightKg={userProfile.weightKg || 78}
        onSave={handleSaveWeight}
      />

      {/* Quick Add Meal Modal */}
      <MealResultModal
        visible={isMealModalOpen}
        onClose={() => setIsMealModalOpen(false)}
        result={{
          foodName: 'Quick Logged Meal',
          calories: 450,
          protein: 30,
          carbs: 45,
          fats: 15,
          servingSize: '1 serving',
          confidence: 1.0,
          breakdown: [
            { item: 'Meal Portion', portion: '1 serving', calories: 450 },
          ],
        }}
        defaultMealType="lunch"
        onConfirm={handleSaveManualMeal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.white,
    borderTopWidth: 1,
    borderTopColor: PALETTE[100],
    height: Platform.OS === 'ios' ? 84 : 68,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
    paddingLeft: 8,
    paddingRight: 14,
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 4,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
  },
  tabLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '600',
    color: PALETTE[400],
    marginTop: 3,
  },
  tabLabelFocused: {
    color: PALETTE[950],
    fontWeight: '700',
  },
  plusContainer: {
    paddingLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButton: {
    width: 46,
    height: 46,
    borderRadius: 18, // Squircle curvature matching screenshot
    backgroundColor: PALETTE[900], // Dark teal-charcoal matching image
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 35, 0.65)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: PALETTE.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 12,
  },
  actionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionSheetTitle: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE[950],
  },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: PALETTE[50],
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  actionOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  actionOptionTitle: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[950],
  },
  aiBadge: {
    backgroundColor: PALETTE[900],
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiBadgeText: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '700',
    color: PALETTE[50],
  },
  trackerBadge: {
    backgroundColor: PALETTE[100],
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trackerBadgeText: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '700',
    color: PALETTE[700],
  },
  actionOptionSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    lineHeight: 15,
  },
});
