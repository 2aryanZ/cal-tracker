import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Leaf from 'lucide-react-native/icons/leaf';
import Bell from 'lucide-react-native/icons/bell';
import Ruler from 'lucide-react-native/icons/ruler';
import UserRound from 'lucide-react-native/icons/user-round';
import Cloud from 'lucide-react-native/icons/cloud';
import Download from 'lucide-react-native/icons/download';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Check from 'lucide-react-native/icons/check';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import type { LucideIcon } from 'lucide-react-native';
import { useNutrition } from '@/context/NutritionContext';
import { AuthModal } from '@/components/AuthModal';
import { ScreenHeader, TempoSheet, tempo } from '@/components/Tempo';
import type {
  MacroTargets,
  NotificationSettings,
  DietaryPreference,
} from '@/types/nutrition';
import { validateGoals } from '@/services/nutritionRules';
import { kgToLbs } from '@/services/tdeeCalculator';
import {
  reviewPendingChanges,
  resolveCloudConflict,
} from '@/services/supabase';
import { JOURNAL as C, FONTS } from '@/constants/theme';
const goalFields: [keyof MacroTargets, string][] = [
  ['calories', 'Calories (kcal)'],
  ['protein', 'Protein (g)'],
  ['carbs', 'Carbohydrate (g)'],
  ['fats', 'Fat (g)'],
  ['waterMl', 'Water (ml)'],
];
const reminders: [
  keyof NotificationSettings,
  keyof NotificationSettings,
  string,
][] = [
  ['breakfastReminder', 'breakfastTime', 'Breakfast'],
  ['lunchReminder', 'lunchTime', 'Lunch'],
  ['dinnerReminder', 'dinnerTime', 'Dinner'],
  ['streakReminder', 'streakTime', 'Daily check-in'],
];
const prefs: DietaryPreference[] = [
  'balanced',
  'high_protein',
  'keto',
  'vegan',
  'vegetarian',
  'mediterranean',
  'paleo',
  'intermittent_fasting',
];
type Sheet =
  | 'targets'
  | 'diet'
  | 'reminders'
  | 'units'
  | 'account'
  | 'data'
  | null;
const titles = {
  targets: 'Your daily targets',
  diet: 'Dietary preference',
  reminders: 'Meal reminders',
  units: 'Measurement units',
  account: 'Account & sync',
  data: 'Your data',
};
function preferenceName(value: string) {
  return value.replaceAll('_', ' ').replace(/^\w/, (c) => c.toUpperCase());
}
function SettingRow({
  Icon,
  label,
  value,
  onPress,
  danger = false,
}: {
  Icon: LucideIcon;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.settingRow}
      onPress={onPress}
    >
      <Icon size={19} color={danger ? C.error : C.accent} />
      <Text style={[styles.settingLabel, danger && { color: C.error }]}>
        {label}
      </Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      <ChevronRight size={16} color={C.muted} />
    </TouchableOpacity>
  );
}
export function SettingsScreen({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const {
    goals,
    updateGoals,
    userProfile,
    saveProfile,
    notificationSettings,
    updateNotifications,
    userAccount,
    dietaryPreference,
    setDietaryPreference,
    signOut,
    syncCloudNow,
    isSyncing,
    setOnboardingVisible,
    showToast,
    exportData,
    resetData,
    refreshData,
  } = useNutrition();
  const [draft, setDraft] = useState<
    Partial<Record<keyof MacroTargets, string>>
  >({});
  const [notifsDraft, setNotifs] = useState<NotificationSettings | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [auth, setAuth] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [reset, setReset] = useState(false);
  const [pending, setPending] = useState<
    Awaited<ReturnType<typeof reviewPendingChanges>>
  >([]);
  const notifs = notifsDraft ?? notificationSettings;
  const open = (next: Sheet) => {
    setError('');
    setDraft({});
    setNotifs(null);
    setSheet(next);
  };
  const run = async (action: () => Promise<unknown>) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to complete this action.',
      );
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const saveTargets = async () => {
    const values = Object.fromEntries(
      goalFields.map(([key]) => [
        key,
        Number(draft[key] ?? goals[key] ?? 2000),
      ]),
    ) as unknown as MacroTargets;
    validateGoals(values);
    await updateGoals(values);
    setDraft({});
    setSheet(null);
    showToast('Targets saved', 'Your daily plan has been updated.');
  };
  const saveReminders = async () => {
    for (const [, key] of reminders)
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(notifs[key])))
        throw new Error('Enter reminder times as HH:MM.');
    await updateNotifications(notifs);
    setNotifs(null);
    setSheet(null);
    showToast('Reminders saved', 'Your reminder schedule has been updated.');
  };
  const backup = async () => {
    const json = await exportData();
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(
        new Blob([json], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `cal-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else
      await Share.share({ title: 'Cal Tracker JSON backup', message: json });
  };
  const review = async () => {
    setPending(await reviewPendingChanges());
  };
  const resolve = async (id: string, keep: boolean) => {
    await resolveCloudConflict(id, keep);
    await refreshData();
    await review();
  };
  const editProfile = () => {
    if (!embedded) router.back();
    setOnboardingVisible(true);
  };
  const initial = userAccount.isLoggedIn
    ? userAccount.name.charAt(0).toUpperCase() || 'Y'
    : 'Y';
  const imperial = userProfile.unitSystem === 'imperial';
  const targetWeight = imperial
    ? kgToLbs(userProfile.targetWeightKg)
    : userProfile.targetWeightKg;
  const errorMessage = error ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {error}
    </Text>
  ) : null;
  const saveButton = (label: string, action: () => Promise<unknown>) => (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={busy}
      style={[
        tempo.primary,
        reset && { backgroundColor: C.error },
        busy && { opacity: 0.5 },
        { marginTop: 16 },
      ]}
      onPress={() => void run(action)}
    >
      <Text style={[tempo.primaryText, reset && { color: C.surface }]}>
        {busy ? 'Saving…' : label}
      </Text>
    </TouchableOpacity>
  );
  return (
    <SafeAreaView
      edges={embedded ? ['top'] : ['top', 'bottom']}
      style={tempo.page}
    >
      <ScrollView
        contentContainerStyle={tempo.body}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={embedded ? 'Profile' : 'Settings'}
          subtitle="Your goals. Your preferences."
          action={
            embedded ? (
              <View style={styles.smallAvatar}>
                <Text style={styles.initial}>{initial}</Text>
              </View>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => router.back()}
                style={tempo.secondary}
              >
                <Text style={tempo.text}>Close</Text>
              </TouchableOpacity>
            )
          }
        />
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {userAccount.isLoggedIn ? userAccount.name : 'Your food journal'}
            </Text>
            <Text style={tempo.caption}>
              {userAccount.isLoggedIn
                ? userAccount.email
                : 'Guest profile · stored on this device'}
            </Text>
            <View style={styles.identityNote}>
              <ShieldCheck size={13} color={C.accent} />
              <Text style={[tempo.caption, { color: C.accent }]}>
                Your own pace
              </Text>
            </View>
          </View>
        </View>
        {!sheet && !reset && errorMessage}
        <View style={[tempo.darkCard, { marginTop: 24 }]}>
          <View style={tempo.between}>
            <Text style={[tempo.darkCaption, { fontFamily: FONTS.semibold }]}>
              Your daily plan
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Edit daily targets"
              onPress={() => open('targets')}
              style={styles.edit}
            >
              <Text style={styles.editText}>Edit</Text>
              <ChevronRight size={16} color={C.lime} />
            </TouchableOpacity>
          </View>
          <View style={styles.planNumbers}>
            <View style={{ flex: 1 }}>
              <Text style={styles.planValue}>
                {goals.calories.toLocaleString()}{' '}
                <Text style={tempo.darkCaption}>kcal</Text>
              </Text>
              <Text style={tempo.darkCaption}>Daily calorie target</Text>
            </View>
            <View style={styles.planDivider} />
            <View style={{ flex: 1 }}>
              <Text style={styles.planValue}>
                {targetWeight}{' '}
                <Text style={tempo.darkCaption}>{imperial ? 'lbs' : 'kg'}</Text>
              </Text>
              <Text style={tempo.darkCaption}>Weight goal</Text>
            </View>
          </View>
          <Text style={tempo.darkCaption}>
            P {goals.protein} g · C {goals.carbs} g · F {goals.fats} g
          </Text>
        </View>
        <Text style={styles.kicker}>YOUR PREFERENCES</Text>
        <View style={styles.group}>
          <SettingRow
            Icon={Leaf}
            label="Dietary preference"
            value={preferenceName(dietaryPreference)}
            onPress={() => open('diet')}
          />
          <SettingRow
            Icon={Bell}
            label="Meal reminders"
            value={notificationSettings.enabled ? 'On' : 'Off'}
            onPress={() => open('reminders')}
          />
          <SettingRow
            Icon={Ruler}
            label="Measurement units"
            value={imperial ? 'Imperial' : 'Metric'}
            onPress={() => open('units')}
          />
          <SettingRow
            Icon={UserRound}
            label="Body & activity profile"
            value="Edit"
            onPress={editProfile}
          />
        </View>
        <Text style={styles.kicker}>ACCOUNT & DATA</Text>
        <View style={styles.group}>
          <SettingRow
            Icon={Cloud}
            label="Account & sync"
            value={userAccount.isLoggedIn ? 'Signed in' : 'Guest'}
            onPress={() => open('account')}
          />
          <SettingRow
            Icon={Download}
            label="Your data"
            value="Export & manage"
            onPress={() => open('data')}
          />
        </View>
        <Text style={[tempo.caption, { textAlign: 'center', marginTop: 24 }]}>
          Cal Tracker · 1.1.4 · Tempo
        </Text>
      </ScrollView>
      <TempoSheet
        visible={sheet !== null}
        title={sheet ? titles[sheet] : ''}
        onClose={() => setSheet(null)}
        busy={busy}
      >
        {errorMessage}
        {busy && (
          <ActivityIndicator
            color={C.accent}
            accessibilityLabel="Saving settings"
          />
        )}
        {sheet === 'targets' && (
          <>
            <Text style={[tempo.caption, { marginBottom: 16 }]}>
              Set daily targets that fit your plan. Water is measured in
              milliliters.
            </Text>
            {goalFields.map(([key, label]) => (
              <View key={key} style={styles.field}>
                <Text style={styles.settingLabel}>{label}</Text>
                <TextInput
                  accessibilityLabel={label}
                  keyboardType="decimal-pad"
                  style={styles.input}
                  value={draft[key] ?? String(goals[key] ?? 2000)}
                  onChangeText={(value) =>
                    setDraft((d) => ({ ...d, [key]: value }))
                  }
                />
              </View>
            ))}
            {saveButton('Save daily targets', saveTargets)}
            <TouchableOpacity
              accessibilityRole="button"
              style={[tempo.secondary, { marginTop: 12 }]}
              onPress={() => {
                setSheet(null);
                editProfile();
              }}
            >
              <Text style={tempo.text}>Recalculate from my profile</Text>
            </TouchableOpacity>
          </>
        )}
        {sheet === 'diet' && (
          <>
            <Text style={tempo.caption}>
              Used to personalize your meal ideas.
            </Text>
            {prefs.map((pref) => (
              <TouchableOpacity
                key={pref}
                accessibilityRole="button"
                accessibilityState={{ selected: dietaryPreference === pref }}
                disabled={busy}
                style={[
                  styles.choice,
                  dietaryPreference === pref && styles.selectedChoice,
                ]}
                onPress={() =>
                  void run(async () => {
                    await setDietaryPreference(pref);
                    setSheet(null);
                  })
                }
              >
                <Text style={tempo.text}>{preferenceName(pref)}</Text>
                {dietaryPreference === pref && (
                  <Check size={18} color={C.accent} />
                )}
              </TouchableOpacity>
            ))}
          </>
        )}
        {sheet === 'reminders' && (
          <>
            <View style={styles.field}>
              <Text style={styles.settingLabel}>Enable reminders</Text>
              <Switch
                accessibilityLabel="Enable reminders"
                trackColor={{ true: C.accent }}
                value={notifs.enabled}
                onValueChange={(enabled) => setNotifs({ ...notifs, enabled })}
              />
            </View>
            <Text style={[tempo.caption, { marginVertical: 12 }]}>
              Times use your device’s local time. Enter HH:MM, for example
              08:30.
            </Text>
            {reminders.map(([toggle, time, label]) => (
              <View key={label} style={styles.reminder}>
                <Text style={styles.settingLabel}>{label}</Text>
                <TextInput
                  accessibilityLabel={`${label} reminder time, HH:MM`}
                  style={[styles.input, { width: 82 }]}
                  value={String(notifs[time])}
                  onChangeText={(value) =>
                    setNotifs({ ...notifs, [time]: value })
                  }
                  placeholder="HH:MM"
                />
                <Switch
                  accessibilityLabel={`${label} reminder`}
                  trackColor={{ true: C.accent }}
                  value={Boolean(notifs[toggle])}
                  onValueChange={(enabled) =>
                    setNotifs({ ...notifs, [toggle]: enabled })
                  }
                />
              </View>
            ))}
            {saveButton('Save reminders', saveReminders)}
          </>
        )}
        {sheet === 'units' && (
          <>
            <Text style={tempo.caption}>
              Recorded weights stay accurate when you switch units.
            </Text>
            {(['metric', 'imperial'] as const).map((unit) => (
              <TouchableOpacity
                key={unit}
                accessibilityRole="button"
                disabled={busy}
                accessibilityState={{
                  selected: userProfile.unitSystem === unit,
                }}
                style={[
                  styles.choice,
                  userProfile.unitSystem === unit && styles.selectedChoice,
                ]}
                onPress={() =>
                  void run(async () => {
                    await saveProfile(
                      { ...userProfile, unitSystem: unit },
                      goals,
                    );
                    setSheet(null);
                  })
                }
              >
                <Text style={tempo.text}>
                  {unit === 'metric'
                    ? 'Metric · kg & cm'
                    : 'Imperial · lbs & ft'}
                </Text>
                {userProfile.unitSystem === unit && (
                  <Check size={18} color={C.accent} />
                )}
              </TouchableOpacity>
            ))}
          </>
        )}
        {sheet === 'account' && (
          <>
            <Text style={tempo.sectionTitle}>
              {userAccount.isLoggedIn
                ? userAccount.name
                : 'Keep your journal with you'}
            </Text>
            <Text style={[tempo.text, { marginVertical: 12 }]}>
              {userAccount.isLoggedIn
                ? userAccount.email
                : 'Sign in to sync your records across your devices. Guest records stay on this device.'}
            </Text>
            <Text style={tempo.caption}>
              Guest data and each signed-in account have separate records.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={busy}
              style={[tempo.primary, { marginVertical: 16 }]}
              onPress={() =>
                userAccount.isLoggedIn
                  ? void run(async () => {
                      await signOut();
                      setPending([]);
                      setSheet(null);
                    })
                  : (setSheet(null), setAuth(true))
              }
            >
              <Text style={tempo.primaryText}>
                {userAccount.isLoggedIn
                  ? 'Sign out'
                  : 'Sign in or create an account'}
              </Text>
            </TouchableOpacity>
            {userAccount.isLoggedIn && (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy || isSyncing}
                  style={[tempo.secondary, { marginBottom: 12 }]}
                  onPress={() => void run(syncCloudNow)}
                >
                  <Text style={tempo.text}>
                    {isSyncing ? 'Syncing…' : 'Sync account now'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy}
                  style={tempo.secondary}
                  onPress={() => void run(review)}
                >
                  <Text style={tempo.text}>Review pending cloud changes</Text>
                </TouchableOpacity>
              </>
            )}
            {pending
              .filter((p) => p.conflict)
              .map((p) => (
                <View key={p.change.id} style={[tempo.card, { marginTop: 16 }]}>
                  <Text style={tempo.sectionTitle}>
                    Conflict: {p.change.entity} · {p.change.key}
                  </Text>
                  <Text selectable style={tempo.caption}>
                    This device: {JSON.stringify(p.change.payload)}
                  </Text>
                  <Text selectable style={tempo.caption}>
                    Cloud:{' '}
                    {JSON.stringify(p.remote ?? 'Deleted or unavailable')}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={busy}
                    style={[tempo.secondary, { marginTop: 12 }]}
                    onPress={() => void run(() => resolve(p.change.id, true))}
                  >
                    <Text style={tempo.text}>Keep my version</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={busy}
                    style={[tempo.secondary, { marginTop: 12 }]}
                    onPress={() => void run(() => resolve(p.change.id, false))}
                  >
                    <Text style={tempo.text}>Use cloud version</Text>
                  </TouchableOpacity>
                </View>
              ))}
            {pending.length > 0 && (
              <Text style={tempo.caption}>
                {pending.length} change(s) waiting to sync.
              </Text>
            )}
          </>
        )}
        {sheet === 'data' && (
          <>
            <Text style={[tempo.caption, { marginBottom: 16 }]}>
              Export a copy of your records before clearing your journal.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={busy}
              style={tempo.primary}
              onPress={() => void run(backup)}
            >
              <Text style={tempo.primaryText}>
                {Platform.OS === 'web'
                  ? 'Download JSON backup'
                  : 'Share JSON backup'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={busy}
              style={[tempo.secondary, { marginTop: 20 }]}
              onPress={() => {
                setSheet(null);
                setReset(true);
              }}
            >
              <Text style={[tempo.text, { color: C.error }]}>
                Clear logged data for this account
              </Text>
            </TouchableOpacity>
          </>
        )}
      </TempoSheet>
      <AuthModal visible={auth} onClose={() => setAuth(false)} />
      <TempoSheet
        visible={reset}
        title="Clear logged data?"
        busy={busy}
        onClose={() => setReset(false)}
      >
        <Text style={tempo.text}>
          This removes meals, weigh-ins, water logs, favorites and badges for
          the current account. Signed-in deletions will sync to the cloud.
          Export a backup first if you need these records.
        </Text>
        {errorMessage}
        <TouchableOpacity
          accessibilityRole="button"
          disabled={busy}
          style={[tempo.secondary, { marginTop: 20 }]}
          onPress={() => setReset(false)}
        >
          <Text style={tempo.text}>Cancel</Text>
        </TouchableOpacity>
        {saveButton('Clear data', async () => {
          await resetData();
          setReset(false);
          showToast('Logs cleared', 'Your targets and profile were kept.');
        })}
      </TempoSheet>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  smallAvatar: {
    height: 48,
    width: 48,
    backgroundColor: C.lime,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontFamily: FONTS.bold, fontSize: 20, color: C.ink },
  identity: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  avatar: {
    height: 68,
    width: 68,
    borderRadius: 22,
    backgroundColor: C.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontFamily: FONTS.bold, fontSize: 32, color: C.ink },
  name: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    letterSpacing: -0.8,
    color: C.ink,
    marginBottom: 6,
  },
  identityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  edit: {
    minHeight: 48,
    minWidth: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  editText: { fontFamily: FONTS.semibold, fontSize: 12, color: C.lime },
  planNumbers: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  planValue: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: C.surface,
    letterSpacing: -1,
    marginBottom: 8,
  },
  planDivider: { width: 1, backgroundColor: C.darkTrack },
  kicker: {
    fontFamily: FONTS.semibold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: C.muted,
    marginTop: 12,
    marginBottom: 12,
  },
  group: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  settingLabel: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    lineHeight: 20,
    color: C.ink,
    flex: 1,
  },
  settingValue: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: C.muted,
    maxWidth: '34%',
    textAlign: 'right',
  },
  field: { ...tempo.between, marginBottom: 12 },
  reminder: { ...tempo.between, flexWrap: 'wrap', marginBottom: 16 },
  input: {
    width: 100,
    minHeight: 48,
    padding: 12,
    fontFamily: FONTS.sans,
    fontSize: 16,
    color: C.ink,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    borderRadius: 12,
  },
  choice: {
    ...tempo.between,
    minHeight: 56,
    padding: 16,
    borderRadius: 14,
    backgroundColor: C.surface,
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  selectedChoice: { backgroundColor: C.selected, borderColor: C.accent },
  error: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: C.error,
    lineHeight: 21,
    marginVertical: 12,
  },
});
export default SettingsScreen;
