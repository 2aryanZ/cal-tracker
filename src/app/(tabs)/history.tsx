import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Modal,
  PanResponder,
  TextInput,
  Alert,
} from 'react-native';
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
  ChevronDown,
  X,
  Check,
  BarChart2,
  CalendarDays,
  Sparkles,
  Repeat,
  Star,
  Plus,
  Clock,
  Zap,
  Users,
  Flame,
  ShieldCheck,
} from 'lucide-react-native';
import { useNutrition } from '@/context/NutritionContext';
import { MealCard } from '@/components/MealCard';
import { MealResultModal } from '@/components/MealResultModal';
import { formatDateLabel, getTodayDateString, getCommunityGroups, saveCommunityGroups, DEFAULT_COMMUNITY_GROUPS } from '@/services/storage';
import { MealType, AiFoodDetectionResult, FoodEntry, CommunityGroup } from '@/types/nutrition';
import { PALETTE, FONTS } from '@/constants/theme';
import { triggerSelection, triggerLightImpact, triggerSuccessFeedback } from '@/services/hapticsService';

type ViewMode = 'day' | 'week' | 'month';

export default function HistoryScreen() {
  const {
    entries,
    selectedDate,
    setSelectedDate,
    goals,
    consumed,
    remaining,
    waterMl,
    logMeal,
    editMeal,
    removeMeal,
    showToast,
  } = useNutrition();

  const [activeTab, setActiveTab] = useState<'groups' | 'calendar'>('groups');
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [isViewSelectorOpen, setIsViewSelectorOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>('lunch');
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [sampleResult, setSampleResult] = useState<AiFoodDetectionResult | null>(null);

  // Community Groups State
  const [groups, setGroups] = useState<CommunityGroup[]>(DEFAULT_COMMUNITY_GROUPS);
  const [createGroupModal, setCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupGoal, setNewGroupGoal] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('🔥');

  useEffect(() => {
    getCommunityGroups().then((stored) => {
      if (stored && stored.length > 0) {
        setGroups(stored);
      }
    });
  }, []);

  const handleToggleJoin = async (groupId: string) => {
    triggerSuccessFeedback();
    const updated = groups.map((g) => {
      if (g.id === groupId) {
        const nextJoined = !g.isJoined;
        return {
          ...g,
          isJoined: nextJoined,
          membersCount: nextJoined ? g.membersCount + 1 : Math.max(1, g.membersCount - 1),
        };
      }
      return g;
    });
    setGroups(updated);
    await saveCommunityGroups(updated);
    const target = updated.find((g) => g.id === groupId);
    if (target?.isJoined) {
      showToast('Joined Group! 🎉', `You are now active in "${target.name}".`, 'sparkles');
    } else {
      showToast('Left Group', `Removed from "${target?.name}".`, 'sparkles');
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Group Name', 'Please enter a group name.');
      return;
    }
    triggerSuccessFeedback();
    const newGroup: CommunityGroup = {
      id: `grp_${Date.now()}`,
      name: newGroupName.trim(),
      description: newGroupGoal.trim() || 'Daily nutrition & accountability challenge',
      emoji: newGroupEmoji || '🎯',
      category: 'deficit',
      membersCount: 1,
      activeTodayPct: 100,
      isJoined: true,
      streakDays: 1,
      dailyGoal: newGroupGoal.trim() || 'Daily Goal',
    };
    const updated = [newGroup, ...groups];
    setGroups(updated);
    await saveCommunityGroups(updated);
    setNewGroupName('');
    setNewGroupGoal('');
    setCreateGroupModal(false);
    showToast('Group Created! 🏆', `"${newGroup.name}" is now in your active groups.`, 'sparkles');
  };

  // Active month in Month View
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  const currentDateObj = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDate]);

  const handlePrevDay = () => {
    triggerSelection();
    const prev = new Date(currentDateObj);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    triggerSelection();
    const next = new Date(currentDateObj);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  // Touch Swipe Gesture for Calendar Days (Swipe Left = Next Day, Swipe Right = Prev Day)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 35 && Math.abs(gestureState.dy) < 25;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 45) {
          // Swiped Right -> Previous Day
          handlePrevDay();
        } else if (gestureState.dx < -45) {
          // Swiped Left -> Next Day
          handleNextDay();
        }
      },
    })
  ).current;

  // Extended Horizontal Scrollable Date Strip (-14 to +14 days centered around selectedDate)
  const dateStrip = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const centerDate = new Date(year, month - 1, day);

    const strip = [];
    for (let i = -14; i <= 14; i++) {
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
  const dayEntries = useMemo(() => entries.filter((e) => e.date === selectedDate), [entries, selectedDate]);
  const breakfastEntries = useMemo(() => dayEntries.filter((e) => e.mealType === 'breakfast'), [dayEntries]);
  const lunchEntries = useMemo(() => dayEntries.filter((e) => e.mealType === 'lunch'), [dayEntries]);
  const dinnerEntries = useMemo(() => dayEntries.filter((e) => e.mealType === 'dinner'), [dayEntries]);
  const snackEntries = useMemo(() => dayEntries.filter((e) => e.mealType === 'snack'), [dayEntries]);

  const totalDayCalories = dayEntries.reduce((sum, e) => sum + (Number(e.calories) || 0), 0);
  const totalDayProtein = dayEntries.reduce((sum, e) => sum + (Number(e.protein) || 0), 0);
  const totalDayCarbs = dayEntries.reduce((sum, e) => sum + (Number(e.carbs) || 0), 0);
  const totalDayFats = dayEntries.reduce((sum, e) => sum + (Number(e.fats) || 0), 0);

  // 7-day average calculation
  const weeklyAvgCalories = useMemo(() => {
    const last7 = dateStrip.slice(11, 18);
    const total = last7.reduce((sum, d) => sum + d.dayCal, 0);
    const activeDays = last7.filter((d) => d.dayCal > 0).length || 1;
    return Math.round(total / activeDays);
  }, [dateStrip]);

  // Week View: Current Week Days (Sun - Sat)
  const currentWeekDays = useMemo(() => {
    const today = currentDateObj;
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayStr}`;

      const dayMeals = entries.filter((e) => e.date === dateStr);
      const cals = dayMeals.reduce((sum, e) => sum + (Number(e.calories) || 0), 0);
      const protein = dayMeals.reduce((sum, e) => sum + (Number(e.protein) || 0), 0);

      list.push({
        dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        cals,
        protein,
        isGoalMet: cals >= goals.calories * 0.85 && cals <= goals.calories * 1.15,
        isSelected: dateStr === selectedDate,
      });
    }
    return list;
  }, [currentDateObj, entries, goals.calories, selectedDate]);

  // Month View: Grid Calculation
  const monthDaysGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = [];
    // Leading empty slots
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(null);
    }
    // Days of the month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;

      const dayMeals = entries.filter((e) => e.date === dateStr);
      const cals = dayMeals.reduce((sum, e) => sum + (Number(e.calories) || 0), 0);

      grid.push({
        day,
        dateStr,
        cals,
        isLogged: cals > 0,
        isGoalMet: cals >= goals.calories * 0.85 && cals <= goals.calories * 1.15,
        isSelected: dateStr === selectedDate,
        isToday: dateStr === getTodayDateString(),
      });
    }
    return grid;
  }, [calendarMonth, entries, goals.calories, selectedDate]);

  const isGoalMet =
    totalDayCalories >= goals.calories * 0.85 && totalDayCalories <= goals.calories * 1.15;

  const handleCopyDayToToday = async () => {
    triggerSuccessFeedback();
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
    showToast('Meals Copied! ⚡', `Copied ${dayEntries.length} meals to Today's tracker.`, 'sparkles');
  };


  const handleOpenAdd = (type: MealType) => {
    triggerLightImpact();
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
    triggerLightImpact();
    setEditingEntry(entry);
    setSampleResult(null);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header with Tab Switcher & Interactive View Selector */}
      <View style={styles.header}>
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.switchTab, activeTab === 'calendar' && styles.switchTabActive]}
            onPress={() => {
              triggerSelection();
              setActiveTab('calendar');
            }}>
            <Text style={[styles.switchTabText, activeTab === 'calendar' && styles.switchTabTextActive]}>
              Calendar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchTab, activeTab === 'groups' && styles.switchTabActive]}
            onPress={() => {
              triggerSelection();
              setActiveTab('groups');
            }}>
            <Text style={[styles.switchTabText, activeTab === 'groups' && styles.switchTabTextActive]}>
              Community Groups
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right Header Action: '+ Create Group' when in Groups tab, or Date selector when in Calendar */}
        {activeTab === 'groups' ? (
          <TouchableOpacity
            style={styles.createGroupHeaderBtn}
            onPress={() => {
              triggerLightImpact();
              setCreateGroupModal(true);
            }}
            activeOpacity={0.85}>
            <Plus size={14} color={PALETTE.white} />
            <Text style={styles.createGroupHeaderBtnText}>New Group</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.todayButton}
            onPress={() => {
              triggerLightImpact();
              setIsViewSelectorOpen(true);
            }}
            activeOpacity={0.85}>
            <CalendarIcon size={13} color={PALETTE[950]} />
            <Text style={styles.todayBtnText}>
              {selectedDate === getTodayDateString() ? 'Today' : viewMode === 'week' ? 'Week' : viewMode === 'month' ? 'Month' : formatDateLabel(selectedDate)}
            </Text>
            <ChevronDown size={12} color={PALETTE[600]} />
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'groups' ? (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Groups Hero Card */}
          <View style={styles.groupHeroCard}>
            <View style={styles.groupHeroLeft}>
              <View style={styles.heroBadgeRow}>
                <Flame size={13} color="#EA580C" />
                <Text style={styles.heroBadgeText}>ACCOUNTABILITY PODS</Text>
              </View>
              <Text style={styles.groupHeroTitle}>Streak Challenges</Text>
              <Text style={styles.groupHeroSub}>
                Shared accountability boosts meal tracking consistency by 3.4x.
              </Text>
            </View>
            <View style={styles.trophyCircle}>
              <Trophy size={26} color={PALETTE[950]} />
            </View>
          </View>

          {/* User's Joined Groups */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleText}>
              YOUR ACTIVE GROUPS ({groups.filter((g) => g.isJoined).length})
            </Text>
            <TouchableOpacity
              onPress={() => {
                triggerLightImpact();
                setCreateGroupModal(true);
              }}
              style={styles.addInlineBtn}>
              <Plus size={12} color={PALETTE[950]} />
              <Text style={styles.addInlineBtnText}>Create Group</Text>
            </TouchableOpacity>
          </View>

          {groups.filter((g) => g.isJoined).length === 0 ? (
            <View style={styles.emptyGroupsCard}>
              <Text style={styles.emptyGroupsEmoji}>🤝</Text>
              <Text style={styles.emptyGroupsTitle}>No active groups yet</Text>
              <Text style={styles.emptyGroupsSub}>
                Join one of the recommended challenges below or create your own custom group!
              </Text>
            </View>
          ) : (
            groups
              .filter((g) => g.isJoined)
              .map((grp) => (
                <View key={grp.id} style={styles.joinedGroupCard}>
                  <View style={styles.commTop}>
                    <View style={styles.commAvatar}>
                      <Text style={{ fontSize: 22 }}>{grp.emoji}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.commName}>{grp.name}</Text>
                        <ShieldCheck size={14} color="#059669" />
                      </View>
                      <Text style={styles.commGoalText}>🎯 Goal: {grp.dailyGoal}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.leavePillBtn}
                      onPress={() => handleToggleJoin(grp.id)}
                      activeOpacity={0.8}>
                      <Text style={styles.leavePillText}>Joined</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.groupStatsDivider} />

                  <View style={styles.groupStatsRow}>
                    <View style={styles.groupStatItem}>
                      <Users size={12} color={PALETTE[600]} />
                      <Text style={styles.groupStatText}>{grp.membersCount.toLocaleString()} members</Text>
                    </View>
                    <View style={styles.groupStatItem}>
                      <Flame size={12} color="#EA580C" />
                      <Text style={styles.groupStatText}>{grp.streakDays}d streak</Text>
                    </View>
                    <View style={styles.groupStatItem}>
                      <Text style={[styles.groupStatText, { color: '#059669', fontWeight: '700' }]}>
                        {grp.activeTodayPct}% active today
                      </Text>
                    </View>
                  </View>
                </View>
              ))
          )}

          {/* Suggested Groups Shelf */}
          <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
            <Text style={styles.sectionTitleText}>SUGGESTIONS TO JOIN</Text>
            <Text style={styles.sectionTitleSub}>Tap + to join</Text>
          </View>

          {groups
            .filter((g) => !g.isJoined)
            .map((grp) => (
              <View key={grp.id} style={styles.suggestedGroupCard}>
                <View style={styles.commAvatarSmall}>
                  <Text style={{ fontSize: 20 }}>{grp.emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.suggestedGroupName}>{grp.name}</Text>
                  <Text style={styles.suggestedGroupGoal}>{grp.description}</Text>
                  <Text style={styles.suggestedGroupMeta}>
                    {grp.membersCount.toLocaleString()} members • {grp.activeTodayPct}% active today
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => handleToggleJoin(grp.id)}
                  activeOpacity={0.85}>
                  <Plus size={13} color={PALETTE.white} />
                  <Text style={styles.joinBtnText}>Join</Text>
                </TouchableOpacity>
              </View>
            ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <>
          {/* Date Navigator Header (Previous / Next Day) */}
          <View style={styles.dateNavigator}>
            <TouchableOpacity onPress={handlePrevDay} style={styles.navArrowBtn}>
              <ChevronLeft size={18} color={PALETTE[950]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateDisplay}
              onPress={() => setIsViewSelectorOpen(true)}
              activeOpacity={0.8}>
              <Text style={styles.dateMainText}>{formatDateLabel(selectedDate)}</Text>
              <Text style={styles.dateSubText}>{selectedDate} • Tap to change view</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNextDay} style={styles.navArrowBtn}>
              <ChevronRight size={18} color={PALETTE[950]} />
            </TouchableOpacity>
          </View>

          {/* Horizontally Scrollable & Swipeable Calendar Ribbon */}
          <View style={styles.stripScrollWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stripScrollContent}>
              {dateStrip.map((item) => (
                <TouchableOpacity
                  key={item.dateStr}
                  style={[styles.stripItem, item.isSelected && styles.stripItemSelected]}
                  onPress={() => {
                    triggerSelection();
                    setSelectedDate(item.dateStr);
                  }}
                  activeOpacity={0.7}>
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
            </ScrollView>
          </View>

          {/* ============================================================ */}
          {/* VIEW MODE 1: DAY VIEW (With Touch Gesture Swiping) */}
          {/* ============================================================ */}
          {viewMode === 'day' && (
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              {...panResponder.panHandlers}>
              {/* Day Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryTop}>
                  <View>
                    <Text style={styles.summaryLabel}>LOCKED DAILY TOTALS</Text>
                    <Text style={styles.summaryCalories}>
                      {totalDayCalories}{' '}
                      <Text style={styles.summaryGoal}>/ {goals.calories} kcal</Text>
                    </Text>
                    <Text style={styles.weeklyAvgSub}>7-day average: {weeklyAvgCalories} kcal/day</Text>
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
                  <View style={styles.macroPill}>
                    <View style={styles.macroPillHeader}>
                      <Droplet size={11} color="#0284C7" fill="#0284C7" />
                      <Text style={[styles.macroPillLabel, { color: '#0284C7' }]}>Water</Text>
                    </View>
                    <Text style={styles.macroPillVal}>{(waterMl / 1000).toFixed(1)}L</Text>
                  </View>
                </View>


                {/* Copy To Today Action */}
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
          )}

          {/* ============================================================ */}
          {/* VIEW MODE 2: WEEK VIEW */}
          {/* ============================================================ */}
          {viewMode === 'week' && (
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              <View style={styles.weekOverviewCard}>
                <Text style={styles.weekOverviewTitle}>Weekly Macro Performance</Text>
                <Text style={styles.weekOverviewSub}>7-day breakdown for this calendar week</Text>

                <View style={styles.weekBarsContainer}>
                  {currentWeekDays.map((day) => {
                    const heightPct = Math.min(100, Math.round((day.cals / (goals.calories || 2000)) * 100));
                    return (
                      <TouchableOpacity
                        key={day.dateStr}
                        style={[styles.weekBarCol, day.isSelected && styles.weekBarColSelected]}
                        onPress={() => {
                          triggerSelection();
                          setSelectedDate(day.dateStr);
                          setViewMode('day');
                        }}>
                        <Text style={styles.weekBarCalsText}>{day.cals > 0 ? `${day.cals}` : '-'}</Text>
                        <View style={styles.weekBarTrack}>
                          <View
                            style={[
                              styles.weekBarFill,
                              { height: `${Math.max(8, heightPct)}%` },
                              day.isGoalMet && styles.weekBarFillMet,
                            ]}
                          />
                        </View>
                        <Text style={[styles.weekBarDayLabel, day.isSelected && styles.weekBarDayLabelActive]}>
                          {day.dayName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={styles.switchBackBtn}
                onPress={() => setViewMode('day')}
                activeOpacity={0.85}>
                <Text style={styles.switchBackBtnText}>Switch to Day Details View</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ============================================================ */}
          {/* VIEW MODE 3: MONTH VIEW (Interactive Grid Calendar) */}
          {/* ============================================================ */}
          {viewMode === 'month' && (
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              <View style={styles.monthCalendarCard}>
                {/* Month Navigator Header */}
                <View style={styles.monthHeaderRow}>
                  <TouchableOpacity
                    onPress={() => {
                      triggerSelection();
                      setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
                    }}
                    style={styles.monthNavBtn}>
                    <ChevronLeft size={16} color={PALETTE[950]} />
                  </TouchableOpacity>

                  <Text style={styles.monthTitleText}>
                    {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      triggerSelection();
                      setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
                    }}
                    style={styles.monthNavBtn}>
                    <ChevronRight size={16} color={PALETTE[950]} />
                  </TouchableOpacity>
                </View>

                {/* Day Headers (S, M, T, W, T, F, S) */}
                <View style={styles.monthWeekHeaderRow}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <Text key={i} style={styles.monthWeekHeaderLetter}>
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Month Days Grid */}
                <View style={styles.monthGrid}>
                  {monthDaysGrid.map((item, index) => {
                    if (!item) {
                      return <View key={`empty_${index}`} style={styles.monthDayEmpty} />;
                    }
                    return (
                      <TouchableOpacity
                        key={item.dateStr}
                        style={[
                          styles.monthDayCell,
                          item.isSelected && styles.monthDayCellSelected,
                          item.isToday && !item.isSelected && styles.monthDayCellToday,
                        ]}
                        onPress={() => {
                          triggerSelection();
                          setSelectedDate(item.dateStr);
                          setViewMode('day');
                        }}
                        activeOpacity={0.8}>
                        <Text
                          style={[
                            styles.monthDayNum,
                            item.isSelected && styles.monthDayNumSelected,
                            item.isToday && !item.isSelected && styles.monthDayNumToday,
                          ]}>
                          {item.day}
                        </Text>
                        <View
                          style={[
                            styles.monthDot,
                            item.isLogged && styles.monthDotLogged,
                            item.isGoalMet && styles.monthDotMet,
                          ]}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={styles.switchBackBtn}
                onPress={() => setViewMode('day')}
                activeOpacity={0.85}>
                <Text style={styles.switchBackBtnText}>Back to Day Logs</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* INTERACTIVE VIEW & RANGE SELECTOR MODAL ("Today / Day / Week / Month") */}
      {/* ============================================================ */}
      <Modal
        visible={isViewSelectorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsViewSelectorOpen(false)}>
        <TouchableOpacity
          style={styles.viewModalOverlay}
          activeOpacity={1}
          onPress={() => setIsViewSelectorOpen(false)}>
          <View style={styles.viewModalCard}>
            <View style={styles.viewModalHeader}>
              <View style={styles.viewModalTitleRow}>
                <CalendarDays size={16} color={PALETTE[950]} />
                <Text style={styles.viewModalTitle}>Calendar View & Range</Text>
              </View>
              <TouchableOpacity onPress={() => setIsViewSelectorOpen(false)}>
                <X size={16} color={PALETTE[600]} />
              </TouchableOpacity>
            </View>

            {/* Jump to Today Option */}
            <TouchableOpacity
              style={styles.viewOptionItem}
              onPress={() => {
                triggerSelection();
                setSelectedDate(getTodayDateString());
                setViewMode('day');
                setIsViewSelectorOpen(false);
              }}
              activeOpacity={0.8}>
              <View style={styles.viewOptionIconBox}>
                <Sparkles size={16} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.viewOptionName}>Jump to Today</Text>
                <Text style={styles.viewOptionSub}>View and track active meals for today</Text>
              </View>
              {selectedDate === getTodayDateString() && <Check size={16} color={PALETTE[950]} />}
            </TouchableOpacity>

            {/* Option 1: Day View */}
            <TouchableOpacity
              style={[styles.viewOptionItem, viewMode === 'day' && styles.viewOptionItemActive]}
              onPress={() => {
                triggerSelection();
                setViewMode('day');
                setIsViewSelectorOpen(false);
              }}
              activeOpacity={0.8}>
              <View style={styles.viewOptionIconBox}>
                <CalendarIcon size={16} color={PALETTE[700]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.viewOptionName}>Day View (Single Day Log)</Text>
                <Text style={styles.viewOptionSub}>Swipe left/right or tap calendar to switch days</Text>
              </View>
              {viewMode === 'day' && <Check size={16} color={PALETTE[950]} />}
            </TouchableOpacity>

            {/* Option 2: Week View */}
            <TouchableOpacity
              style={[styles.viewOptionItem, viewMode === 'week' && styles.viewOptionItemActive]}
              onPress={() => {
                triggerSelection();
                setViewMode('week');
                setIsViewSelectorOpen(false);
              }}
              activeOpacity={0.8}>
              <View style={styles.viewOptionIconBox}>
                <BarChart2 size={16} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.viewOptionName}>Week View (7-Day Performance)</Text>
                <Text style={styles.viewOptionSub}>Weekly cumulative totals and macro breakdown</Text>
              </View>
              {viewMode === 'week' && <Check size={16} color={PALETTE[950]} />}
            </TouchableOpacity>

            {/* Option 3: Month View */}
            <TouchableOpacity
              style={[styles.viewOptionItem, viewMode === 'month' && styles.viewOptionItemActive]}
              onPress={() => {
                triggerSelection();
                setViewMode('month');
                setIsViewSelectorOpen(false);
              }}
              activeOpacity={0.8}>
              <View style={styles.viewOptionIconBox}>
                <CalendarDays size={16} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.viewOptionName}>Month View (Full Grid Calendar)</Text>
                <Text style={styles.viewOptionSub}>Pick any date across the entire calendar month</Text>
              </View>
              {viewMode === 'month' && <Check size={16} color={PALETTE[950]} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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

      {/* ============================================================ */}
      {/* CREATE NEW COMMUNITY GROUP MODAL */}
      {/* ============================================================ */}
      <Modal
        visible={createGroupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateGroupModal(false)}>
        <View style={styles.createModalOverlay}>
          <View style={styles.createModalCard}>
            <View style={styles.createModalHeader}>
              <View style={styles.createModalTitleRow}>
                <Users size={18} color={PALETTE[950]} />
                <Text style={styles.createModalTitle}>Create a Group</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateGroupModal(false)} style={styles.createModalClose}>
                <X size={16} color={PALETTE[950]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.createModalSub}>
              Start a shared nutrition streak with friends or your fitness community.
            </Text>

            {/* Emoji Selector */}
            <Text style={styles.inputLabel}>CHOOSE GROUP ICON</Text>
            <View style={styles.emojiPickerRow}>
              {['🥩', '🔥', '🥑', '💧', '🏃', '🎯', '⚡', '🥗', '🏋️'].map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[styles.emojiOption, newGroupEmoji === em && styles.emojiOptionActive]}
                  onPress={() => {
                    triggerSelection();
                    setNewGroupEmoji(em);
                  }}>
                  <Text style={{ fontSize: 20 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Group Name Input */}
            <Text style={styles.inputLabel}>GROUP NAME</Text>
            <TextInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="e.g. 100-Day Calorie Cutters"
              placeholderTextColor={PALETTE[400]}
              style={styles.groupInput}
            />

            {/* Daily Goal Input */}
            <Text style={styles.inputLabel}>DAILY NUTRITION OR ACTIVITY GOAL</Text>
            <TextInput
              value={newGroupGoal}
              onChangeText={setNewGroupGoal}
              placeholder="e.g. Hit 150g Protein or 500 kcal Deficit"
              placeholderTextColor={PALETTE[400]}
              style={styles.groupInput}
            />

            {/* Submit Action */}
            <TouchableOpacity
              style={styles.createGroupSubmitBtn}
              onPress={handleCreateGroup}
              activeOpacity={0.85}>
              <Text style={styles.createGroupSubmitText}>Create & Join Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
  switchTabActive: {
    backgroundColor: PALETTE.white,
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
    gap: 5,
    backgroundColor: PALETTE.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PALETTE[100],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  todayBtnText: {
    fontFamily: FONTS.serif,
    fontSize: 12,
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
    width: 34,
    height: 34,
    borderRadius: 10,
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
  stripScrollWrapper: {
    marginBottom: 12,
  },
  stripScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  stripItem: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: PALETTE.white,
    borderWidth: 1,
    borderColor: PALETTE[100],
    minWidth: 44,
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
    backgroundColor: '#10B981',
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
  weeklyAvgSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    marginTop: 2,
    fontWeight: '500',
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
    marginBottom: 10,
  },
  macroPill: {
    flex: 1,
    backgroundColor: PALETTE[50],
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  macroPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  macroPillLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
  },
  macroPillVal: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  copyToTodayBtn: {
    backgroundColor: PALETTE[50],
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  copyToTodayBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[700],
  },
  repeatYesterdaySection: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  repeatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  repeatTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  repeatTitle: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  repeatSub: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    color: PALETTE[500],
  },
  repeatBtnsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  repeatBtn: {
    flex: 1,
    backgroundColor: PALETTE[50],
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  repeatBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[950],
  },
  shelfCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  shelfHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  shelfTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shelfTitle: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  shelfSub: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[500],
  },
  shelfScroll: {
    gap: 8,
  },
  shelfChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PALETTE[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE[200],
    minWidth: 130,
  },
  shelfChipName: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[950],
    maxWidth: 110,
  },
  shelfChipMacros: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    color: PALETTE[600],
    marginTop: 1,
  },
  suggestionsCard: {
    backgroundColor: '#F8FCFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  suggestionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  suggestionsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionsTitle: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  suggestionsSub: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[600],
  },
  suggestionsGrid: {
    gap: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PALETTE.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  sugName: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[950],
  },
  sugSub: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    color: PALETTE[600],
    marginTop: 1,
  },
  weekOverviewCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  weekOverviewTitle: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[950],
  },
  weekOverviewSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    marginTop: 2,
    marginBottom: 14,
  },
  weekBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingBottom: 4,
  },
  weekBarCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
  },
  weekBarColSelected: {
    backgroundColor: PALETTE[50],
    borderRadius: 8,
  },
  weekBarCalsText: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '600',
    color: PALETTE[400],
    marginBottom: 4,
  },
  weekBarTrack: {
    width: 14,
    height: 85,
    backgroundColor: PALETTE[100],
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  weekBarFill: {
    width: '100%',
    backgroundColor: PALETTE[700],
    borderRadius: 7,
  },
  weekBarFillMet: {
    backgroundColor: '#10B981',
  },
  weekBarDayLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '600',
    color: PALETTE[600],
    marginTop: 6,
  },
  weekBarDayLabelActive: {
    color: PALETTE[950],
    fontWeight: '800',
  },
  switchBackBtn: {
    backgroundColor: PALETTE[950],
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  switchBackBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[50],
  },
  monthCalendarCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleText: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[950],
  },
  monthWeekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  monthWeekHeaderLetter: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[400],
    width: 36,
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthDayEmpty: {
    width: `${100 / 7}%`,
    height: 42,
  },
  monthDayCell: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  monthDayCellSelected: {
    backgroundColor: PALETTE[950],
  },
  monthDayCellToday: {
    borderWidth: 1,
    borderColor: PALETTE[700],
  },
  monthDayNum: {
    fontFamily: FONTS.serif,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[950],
  },
  monthDayNumSelected: {
    color: PALETTE[50],
  },
  monthDayNumToday: {
    color: PALETTE[700],
  },
  monthDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
    backgroundColor: 'transparent',
  },
  monthDotLogged: {
    backgroundColor: PALETTE[500],
  },
  monthDotMet: {
    backgroundColor: '#10B981',
  },
  viewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 35, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  viewModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: PALETTE.white,
    borderRadius: 20,
    padding: 18,
    gap: 10,
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  viewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE[100],
    marginBottom: 4,
  },
  viewModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewModalTitle: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE[950],
  },
  viewOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: PALETTE[50],
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  viewOptionItemActive: {
    borderColor: PALETTE[950],
    backgroundColor: PALETTE[100],
  },
  viewOptionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOptionName: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  viewOptionSub: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[600],
    marginTop: 1,
  },
  createGroupHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE[950],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  createGroupHeaderBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.white,
  },
  groupHeroCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: PALETTE[100],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  groupHeroLeft: {
    flex: 1,
    marginRight: 12,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  heroBadgeText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  groupHeroTitle: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    fontWeight: '800',
    color: PALETTE[950],
    marginBottom: 4,
  },
  groupHeroSub: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[600],
    lineHeight: 17,
  },
  trophyCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PALETTE[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitleText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '800',
    color: PALETTE[500],
    letterSpacing: 0.8,
  },
  sectionTitleSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[400],
  },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addInlineBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[950],
  },
  emptyGroupsCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PALETTE[100],
    marginBottom: 16,
  },
  emptyGroupsEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyGroupsTitle: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[950],
    marginBottom: 4,
  },
  emptyGroupsSub: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[500],
    textAlign: 'center',
    lineHeight: 16,
  },
  joinedGroupCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  commTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  commName: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[950],
  },
  commGoalText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    marginTop: 2,
    fontWeight: '600',
  },
  leavePillBtn: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  leavePillText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  groupStatsDivider: {
    height: 1,
    backgroundColor: PALETTE[100],
    marginVertical: 12,
  },
  groupStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupStatText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
  },
  suggestedGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  commAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedGroupName: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  suggestedGroupGoal: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    marginTop: 1,
  },
  suggestedGroupMeta: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[400],
    marginTop: 2,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE[950],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  joinBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.white,
  },
  createModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 35, 0.7)',
    justifyContent: 'flex-end',
  },
  createModalCard: {
    backgroundColor: PALETTE.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  createModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  createModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createModalTitle: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    fontWeight: '800',
    color: PALETTE[950],
  },
  createModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PALETTE[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  createModalSub: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[600],
    marginBottom: 16,
    lineHeight: 17,
  },
  inputLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '800',
    color: PALETTE[500],
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emojiPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  emojiOption: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  emojiOptionActive: {
    backgroundColor: PALETTE[100],
    borderColor: PALETTE[950],
    borderWidth: 2,
  },
  groupInput: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: PALETTE[950],
    backgroundColor: PALETTE[50],
    borderWidth: 1,
    borderColor: PALETTE[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  createGroupSubmitBtn: {
    backgroundColor: PALETTE[950],
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  createGroupSubmitText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.white,
  },
});
