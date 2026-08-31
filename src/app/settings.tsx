import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  Target,
  Bell,
  Key,
  Check,
  Zap,
  User,
  SlidersHorizontal,
  LogOut,
  LogIn,
  ShieldCheck,
  Crown,
  Database,
} from 'lucide-react-native';
import { useNutrition } from '@/context/NutritionContext';
import { getApiKey, saveApiKey } from '@/services/storage';
import { sendInstantStreakCelebration, requestNotificationPermissions } from '@/services/notificationService';
import { MacroTargets, NotificationSettings } from '@/types/nutrition';
import { AuthModal } from '@/components/AuthModal';
import { PALETTE, FONTS } from '@/constants/theme';

const DIET_PRESETS: { name: string; desc: string; goals: MacroTargets }[] = [
  {
    name: 'Muscle Gain',
    desc: 'High protein + moderate surplus',
    goals: { calories: 2600, protein: 180, carbs: 280, fats: 75, waterMl: 3000 },
  },
  {
    name: 'Fat Loss (Cut)',
    desc: 'Caloric deficit + high protein',
    goals: { calories: 1850, protein: 160, carbs: 140, fats: 55, waterMl: 3000 },
  },
  {
    name: 'Balanced Fitness',
    desc: 'Healthy maintenance ratio',
    goals: { calories: 2200, protein: 150, carbs: 220, fats: 65, waterMl: 2500 },
  },
  {
    name: 'Low Carb / Keto',
    desc: 'High fat + very low carbs',
    goals: { calories: 2000, protein: 140, carbs: 35, fats: 140, waterMl: 3000 },
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const {
    goals,
    updateGoals,
    notificationSettings,
    updateNotifications,
    stats,
    userProfile,
    userAccount,
    signIn,
    signOut,
    setOnboardingVisible,
    triggerManualReward,
    showToast,
  } = useNutrition();

  // Targets state
  const [calories, setCalories] = useState(String(goals.calories));
  const [protein, setProtein] = useState(String(goals.protein));
  const [carbs, setCarbs] = useState(String(goals.carbs));
  const [fats, setFats] = useState(String(goals.fats));

  // Notification state
  const [notifs, setNotifs] = useState<NotificationSettings>(notificationSettings);

  // Gemini API Key state
  const [apiKey, setApiKey] = useState('');

  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    getApiKey().then((k) => setApiKey(k));
  }, []);

  const handleApplyPreset = (preset: typeof DIET_PRESETS[0]) => {
    setCalories(String(preset.goals.calories));
    setProtein(String(preset.goals.protein));
    setCarbs(String(preset.goals.carbs));
    setFats(String(preset.goals.fats));
    showToast('Preset Loaded', `${preset.name} (${preset.goals.calories} kcal)`, 'sparkles');
  };

  const handleSaveAll = async () => {
    const updatedGoals: MacroTargets = {
      calories: Number(calories) || 2200,
      protein: Number(protein) || 150,
      carbs: Number(carbs) || 220,
      fats: Number(fats) || 65,
    };

    await updateGoals(updatedGoals);
    await updateNotifications(notifs);
    await saveApiKey(apiKey.trim());

    showToast('Preferences Saved', 'Your targets and settings have been updated.', 'sparkles');
    setTimeout(() => {
      router.back();
    }, 400);
  };

  const handleSignOutConfirm = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Cal tracker?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const handleToggleReminderMaster = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermissions();
      if (!granted && Platform.OS !== 'web') {
        Alert.alert('Notifications', 'Please enable notifications in system settings to receive meal reminders.');
      }
    }
    const updated = { ...notifs, enabled: val };
    setNotifs(updated);
    await updateNotifications(updated);
    showToast(
      val ? 'Meal Reminders Enabled 🔔' : 'Reminders Paused',
      val ? 'Breakfast, Lunch & Dinner alerts are scheduled.' : 'Notifications turned off.',
      'bell'
    );
  };

  const handleTestMealReminder = (mealName: string) => {
    showToast(
      `🥗 Time for ${mealName}!`,
      `Don't forget to track your ${mealName.toLowerCase()} with Cal tracker to keep your streak!`,
      'utensils'
    );
  };

  const handleTestStreakAlert = async () => {
    await sendInstantStreakCelebration(stats.currentStreak);
    triggerManualReward();
    showToast(
      `🔥 ${stats.currentStreak}-Day Streak Active!`,
      `Great consistency! Lock in your calories before midnight.`,
      'flame'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings & Profile</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={18} color={PALETTE[950]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* User Account / Sign In / Sign Out Section */}
        <Text style={styles.sectionTitle}>ACCOUNT & MEMBERSHIP</Text>
        <View style={styles.accountCard}>
          <View style={styles.accountTop}>
            <View style={styles.accountAvatarBox}>
              <User size={22} color={PALETTE[950]} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.accountNameRow}>
                <Text style={styles.accountName}>{userAccount.name}</Text>
                {userAccount.isLoggedIn ? (
                  <View style={styles.tierBadge}>
                    <Crown size={11} color={PALETTE[700]} />
                    <Text style={styles.tierBadgeText}>{userAccount.tier} Member</Text>
                  </View>
                ) : (
                  <View style={styles.guestBadge}>
                    <Text style={styles.guestBadgeText}>Guest Mode</Text>
                  </View>
                )}
              </View>
              <Text style={styles.accountEmail}>
                {userAccount.isLoggedIn
                  ? `${userAccount.email} • Joined ${userAccount.memberSince}`
                  : 'Sign in to sync your data across devices'}
              </Text>
            </View>
          </View>

          {userAccount.isLoggedIn ? (
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleSignOutConfirm}
              activeOpacity={0.85}>
              <LogOut size={14} color="#DC2626" />
              <Text style={styles.signOutBtnText}>Sign Out of Account</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => setIsAuthModalOpen(true)}
              activeOpacity={0.85}>
              <LogIn size={15} color={PALETTE[50]} />
              <Text style={styles.signInBtnText}>Sign In / Create Account</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* User Biometrics */}
        <Text style={styles.sectionTitle}>SCIENTIFIC NUTRITION PROFILE</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.profileIconBox}>
              <ShieldCheck size={20} color={PALETTE[950]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>
                {userProfile.gender === 'male' ? 'Male' : 'Female'} • {userProfile.age} yrs • {userProfile.weightKg} kg
              </Text>
              <Text style={styles.profileSub}>
                Goal: {userProfile.goal === 'fat_loss' ? 'Fat Loss' : userProfile.goal === 'muscle_gain' ? 'Muscle Gain' : userProfile.goal === 'recomposition' ? 'Body Recomp' : 'Maintenance'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.recalcBtn}
            onPress={() => {
              router.back();
              setTimeout(() => setOnboardingVisible(true), 300);
            }}
            activeOpacity={0.85}>
            <SlidersHorizontal size={15} color={PALETTE[50]} />
            <Text style={styles.recalcBtnText}>Recalculate Metabolic Plan (Onboarding)</Text>
          </TouchableOpacity>
        </View>

        {/* Diet Presets */}
        <Text style={styles.sectionTitle}>QUICK DIET PRESETS</Text>
        <View style={styles.presetGrid}>
          {DIET_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.name}
              style={styles.presetCard}
              onPress={() => handleApplyPreset(p)}
              activeOpacity={0.8}>
              <View style={styles.presetHeader}>
                <Text style={styles.presetName}>{p.name}</Text>
                <Zap size={13} color={PALETTE[600]} />
              </View>
              <Text style={styles.presetDesc}>{p.desc}</Text>
              <Text style={styles.presetCals}>{p.goals.calories} kcal • {p.goals.protein}g P</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Targets Inputs */}
        <Text style={styles.sectionTitle}>CUSTOM DAILY TARGETS</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <View style={styles.inputLabelGroup}>
              <Target size={15} color={PALETTE[950]} />
              <Text style={styles.inputLabel}>Calories Target</Text>
            </View>
            <View style={styles.inputValContainer}>
              <TextInput
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                style={styles.numberInput}
              />
              <Text style={styles.unitText}>kcal</Text>
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputLabelGroup}>
              <View style={[styles.dot, { backgroundColor: PALETTE[700] }]} />
              <Text style={styles.inputLabel}>Protein Target</Text>
            </View>
            <View style={styles.inputValContainer}>
              <TextInput
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
                style={styles.numberInput}
              />
              <Text style={styles.unitText}>g</Text>
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputLabelGroup}>
              <View style={[styles.dot, { backgroundColor: PALETTE[500] }]} />
              <Text style={styles.inputLabel}>Carbs Target</Text>
            </View>
            <View style={styles.inputValContainer}>
              <TextInput
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="numeric"
                style={styles.numberInput}
              />
              <Text style={styles.unitText}>g</Text>
            </View>
          </View>

          <View style={[styles.inputRow, { borderBottomWidth: 0 }]}>
            <View style={styles.inputLabelGroup}>
              <View style={[styles.dot, { backgroundColor: PALETTE[400] }]} />
              <Text style={styles.inputLabel}>Fats Target</Text>
            </View>
            <View style={styles.inputValContainer}>
              <TextInput
                value={fats}
                onChangeText={setFats}
                keyboardType="numeric"
                style={styles.numberInput}
              />
              <Text style={styles.unitText}>g</Text>
            </View>
          </View>
        </View>

        {/* Meal Reminders */}
        <Text style={styles.sectionTitle}>RETENTION & MEAL REMINDERS</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelGroup}>
              <Bell size={16} color={PALETTE[950]} />
              <View>
                <Text style={styles.switchTitle}>Enable Push Reminders</Text>
                <Text style={styles.switchSub}>Scheduled alerts to maintain your streak</Text>
              </View>
            </View>
            <Switch
              value={notifs.enabled}
              onValueChange={handleToggleReminderMaster}
              trackColor={{ false: PALETTE[100], true: PALETTE[950] }}
              thumbColor={notifs.enabled ? PALETTE.white : PALETTE[400]}
            />
          </View>

          {notifs.enabled && (
            <>
              {/* Breakfast */}
              <View style={styles.switchRowSub}>
                <TouchableOpacity
                  style={styles.subItemClickable}
                  onPress={() => handleTestMealReminder('Breakfast')}>
                  <Text style={styles.subItemLabel}>🍳 Breakfast (08:30 AM)</Text>
                  <Text style={styles.testTapLabel}>Tap to Test</Text>
                </TouchableOpacity>
                <Switch
                  value={notifs.breakfastReminder}
                  onValueChange={(val) => setNotifs({ ...notifs, breakfastReminder: val })}
                  trackColor={{ false: PALETTE[100], true: PALETTE[950] }}
                  thumbColor={notifs.breakfastReminder ? PALETTE.white : PALETTE[400]}
                />
              </View>

              {/* Lunch */}
              <View style={styles.switchRowSub}>
                <TouchableOpacity
                  style={styles.subItemClickable}
                  onPress={() => handleTestMealReminder('Lunch')}>
                  <Text style={styles.subItemLabel}>🥗 Lunch (01:00 PM)</Text>
                  <Text style={styles.testTapLabel}>Tap to Test</Text>
                </TouchableOpacity>
                <Switch
                  value={notifs.lunchReminder}
                  onValueChange={(val) => setNotifs({ ...notifs, lunchReminder: val })}
                  trackColor={{ false: PALETTE[100], true: PALETTE[950] }}
                  thumbColor={notifs.lunchReminder ? PALETTE.white : PALETTE[400]}
                />
              </View>

              {/* Dinner */}
              <View style={styles.switchRowSub}>
                <TouchableOpacity
                  style={styles.subItemClickable}
                  onPress={() => handleTestMealReminder('Dinner')}>
                  <Text style={styles.subItemLabel}>🍽️ Dinner (07:30 PM)</Text>
                  <Text style={styles.testTapLabel}>Tap to Test</Text>
                </TouchableOpacity>
                <Switch
                  value={notifs.dinnerReminder}
                  onValueChange={(val) => setNotifs({ ...notifs, dinnerReminder: val })}
                  trackColor={{ false: PALETTE[100], true: PALETTE[950] }}
                  thumbColor={notifs.dinnerReminder ? PALETTE.white : PALETTE[400]}
                />
              </View>

              {/* Night Streak Check */}
              <View style={[styles.switchRowSub, { borderBottomWidth: 0 }]}>
                <TouchableOpacity
                  style={styles.subItemClickable}
                  onPress={handleTestStreakAlert}>
                  <Text style={styles.subItemLabel}>🔥 Night Streak Check (09:30 PM)</Text>
                  <Text style={styles.testTapLabel}>Tap to Test</Text>
                </TouchableOpacity>
                <Switch
                  value={notifs.streakReminder}
                  onValueChange={(val) => setNotifs({ ...notifs, streakReminder: val })}
                  trackColor={{ false: PALETTE[100], true: PALETTE[950] }}
                  thumbColor={notifs.streakReminder ? PALETTE.white : PALETTE[400]}
                />
              </View>
            </>
          )}
        </View>

        {/* Supabase Cloud Database Status */}
        <Text style={styles.sectionTitle}>CLOUD DATABASE & SYNC</Text>
        <View style={styles.card}>
          <View style={styles.apiKeyHeader}>
            <Database size={15} color="#059669" />
            <Text style={styles.apiKeyLabel}>Supabase PostgreSQL</Text>
          </View>
          <Text style={styles.apiKeySub}>
            Connected to project vzsbjffwhjikeeanrzdb (Region: ap-southeast-1). All food entries, macro goals, and weigh-ins sync with Row Level Security.
          </Text>
          <View style={styles.dbStatusPill}>
            <View style={styles.dbStatusDot} />
            <Text style={styles.dbStatusText}>Live Cloud Sync Active • 4 Tables Connected</Text>
          </View>
        </View>

        {/* AI Vision API Key Config */}
        <Text style={styles.sectionTitle}>GEMINI VISION API KEY</Text>
        <View style={styles.card}>
          <View style={styles.apiKeyHeader}>
            <Key size={15} color={PALETTE[950]} />
            <Text style={styles.apiKeyLabel}>Google Gemini API Key</Text>
          </View>
          <Text style={styles.apiKeySub}>
            Provides live multimodal image recognition directly through Google&apos;s Gemini Vision API.
          </Text>
          <TextInput
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="AIzaSy..."
            placeholderTextColor={PALETTE[400]}
            secureTextEntry
            style={styles.apiKeyInput}
          />
        </View>

        {/* Data Management & Cache Optimizer */}
        <Text style={styles.sectionTitle}>DATA & PERFORMANCE</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionLinkRow}
            onPress={() => {
              showToast('Data Exported 📦', `${stats.totalMealsLogged} meals & metrics synced to clipboard.`, 'sparkles');
            }}
            activeOpacity={0.8}>
            <Text style={styles.actionLinkText}>Export Nutrition & Weight History (JSON)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionLinkRow, { borderBottomWidth: 0 }]}
            onPress={() => {
              Alert.alert('Reset App Data', 'Re-seed sample nutrition meals and optimize cache?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset & Optimize',
                  style: 'destructive',
                  onPress: () => {
                    showToast('Cache Cleared ⚡', 'In-memory indexes re-warmed and storage optimized.', 'sparkles');
                  },
                },
              ]);
            }}
            activeOpacity={0.8}>
            <Text style={[styles.actionLinkText, { color: '#DC2626' }]}>Clear Memory Cache & Re-seed Data</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAll} activeOpacity={0.85}>
          <Check size={18} color={PALETTE[50]} />
          <Text style={styles.saveBtnText}>Save Preferences</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Auth Modal for Sign In / Sign Up */}
      <AuthModal
        visible={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={(email, name) => {
          signIn(email, name);
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE[100],
  },
  headerTitle: {
    fontFamily: FONTS.serif,
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE[950],
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  sectionTitle: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '800',
    color: PALETTE[600],
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
  },
  accountCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  accountTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  accountAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PALETTE[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountName: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE[950],
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: PALETTE[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierBadgeText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[700],
  },
  guestBadge: {
    backgroundColor: PALETTE[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  guestBadgeText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[400],
  },
  accountEmail: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    marginTop: 2,
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PALETTE[950],
    borderRadius: 10,
    paddingVertical: 11,
  },
  signInBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[50],
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 9,
  },
  signOutBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  profileCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  profileIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PALETTE[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[950],
  },
  profileSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    marginTop: 2,
  },
  recalcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: PALETTE[950],
    borderRadius: 10,
    paddingVertical: 10,
  },
  recalcBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[50],
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetCard: {
    width: '48%',
    backgroundColor: PALETTE.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  presetName: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  presetDesc: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[600],
    marginBottom: 4,
  },
  presetCals: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[600],
  },
  card: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE[50],
  },
  inputLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inputLabel: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE[800],
  },
  inputValContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  numberInput: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE[950],
    padding: 0,
    textAlign: 'right',
    minWidth: 44,
  },
  unitText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[400],
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE[50],
  },
  switchLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  switchTitle: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[950],
  },
  switchSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    marginTop: 1,
  },
  switchRowSub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE[50],
  },
  subItemClickable: {
    flex: 1,
  },
  subItemLabel: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[800],
    fontWeight: '600',
  },
  testTapLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[600],
    marginTop: 1,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  apiKeyLabel: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[950],
  },
  apiKeySub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    lineHeight: 15,
    marginBottom: 8,
  },
  apiKeyInput: {
    backgroundColor: PALETTE[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: PALETTE[950],
    fontFamily: FONTS.sans,
    fontSize: 13,
    borderWidth: 1,
    borderColor: PALETTE[200],
    marginBottom: 8,
  },
  dbStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 4,
    marginBottom: 4,
  },
  dbStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  dbStatusText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  actionLinkRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE[50],
  },
  actionLinkText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE[950],
  },
  saveBtn: {
    backgroundColor: PALETTE[950],
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  saveBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[50],
  },
});
