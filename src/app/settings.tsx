import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Share,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNutrition } from '@/context/NutritionContext';
import { AuthModal } from '@/components/AuthModal';
import type {
  MacroTargets,
  NotificationSettings,
  DietaryPreference,
} from '@/types/nutrition';
import { validateGoals } from '@/services/nutritionRules';
import {
  reviewPendingChanges,
  resolveCloudConflict,
} from '@/services/supabase';
import { PALETTE, FONTS, JOURNAL } from '@/constants/theme';
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
export function SettingsScreen({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const {
    goals,
    updateGoals,
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
    >({}),
    [notifsDraft, setNotifs] = useState<NotificationSettings | null>(null),
    [auth, setAuth] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [reset, setReset] = useState(false),
    [pending, setPending] = useState<
      Awaited<ReturnType<typeof reviewPendingChanges>>
    >([]);
  const notifs = notifsDraft ?? notificationSettings;
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to complete this action.',
      );
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    const values = Object.fromEntries(
      goalFields.map(([key]) => [
        key,
        Number(draft[key] ?? goals[key] ?? 2000),
      ]),
    ) as unknown as MacroTargets;
    validateGoals(values);
    for (const [, key] of reminders)
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(notifs[key])))
        throw new Error('Enter reminder times as HH:MM.');
    await updateGoals(values);
    await updateNotifications(notifs);
    setDraft({});
    setNotifs(null);
    showToast('Settings saved', 'Your targets and reminders are saved.');
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
  const review = async () => setPending(await reviewPendingChanges());
  const resolve = async (id: string, keep: boolean) => {
    await resolveCloudConflict(id, keep);
    await refreshData();
    await review();
  };
  return (
    <SafeAreaView
      edges={embedded ? ['top'] : ['top', 'bottom']}
      style={styles.page}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {embedded ? 'Your profile' : 'Settings'}
            </Text>
            {!embedded && (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.button}
                onPress={() => router.back()}
              >
                <Text>Close</Text>
              </TouchableOpacity>
            )}
          </View>
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          {busy ? (
            <ActivityIndicator accessibilityLabel="Saving settings" />
          ) : null}
          <View style={styles.card}>
            <Text style={styles.subtitle}>Account</Text>
            <Text style={styles.text}>
              {userAccount.isLoggedIn
                ? `${userAccount.name}\n${userAccount.email}`
                : 'Guest — data is stored on this device.'}
            </Text>
            <Text style={styles.text}>
              Guest data and each signed-in account have separate records.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.button}
              disabled={busy}
              onPress={() =>
                userAccount.isLoggedIn ? void run(signOut) : setAuth(true)
              }
            >
              <Text>
                {userAccount.isLoggedIn
                  ? 'Sign out'
                  : 'Sign in or create an account'}
              </Text>
            </TouchableOpacity>
            {userAccount.isLoggedIn && (
              <>
                <TouchableOpacity
                  style={styles.button}
                  accessibilityRole="button"
                  disabled={busy || isSyncing}
                  onPress={() => void run(syncCloudNow)}
                >
                  <Text>{isSyncing ? 'Syncing…' : 'Sync account now'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => void run(review)}
                >
                  <Text>Review pending cloud changes</Text>
                </TouchableOpacity>
              </>
            )}
            {pending
              .filter((p) => p.conflict)
              .map((p) => (
                <View key={p.change.id} style={styles.conflict}>
                  <Text style={styles.subtitle}>
                    Conflict: {p.change.entity} · {p.change.key}
                  </Text>
                  <Text selectable style={styles.text}>
                    This device: {JSON.stringify(p.change.payload)}
                  </Text>
                  <Text selectable style={styles.text}>
                    Cloud:{' '}
                    {JSON.stringify(p.remote ?? 'Deleted or unavailable')}
                  </Text>
                  <View style={styles.row}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={busy}
                      style={styles.button}
                      onPress={() => void run(() => resolve(p.change.id, true))}
                    >
                      <Text>Keep my version</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={busy}
                      style={styles.button}
                      onPress={() =>
                        void run(() => resolve(p.change.id, false))
                      }
                    >
                      <Text>Use cloud version</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            {pending.length > 0 && (
              <Text style={styles.text}>
                {pending.length} change(s) waiting to sync.
              </Text>
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.subtitle}>Daily targets</Text>
            {goalFields.map(([key, label]) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
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
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.button}
              onPress={() => {
                if (!embedded) router.back();
                setOnboardingVisible(true);
              }}
            >
              <Text>Edit profile and recalculate targets</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <Text style={styles.subtitle}>Dietary preference</Text>
            <View style={styles.row}>
              {prefs.map((pref) => (
                <TouchableOpacity
                  key={pref}
                  accessibilityRole="button"
                  accessibilityState={{ selected: dietaryPreference === pref }}
                  disabled={busy}
                  style={[
                    styles.button,
                    dietaryPreference === pref && styles.active,
                  ]}
                  onPress={() => void run(() => setDietaryPreference(pref))}
                >
                  <Text>{pref.replaceAll('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.subtitle}>Meal reminders</Text>
              <Switch
                accessibilityLabel="Enable reminders"
                value={notifs.enabled}
                onValueChange={(enabled) => setNotifs({ ...notifs, enabled })}
              />
            </View>
            <Text style={styles.text}>
              Times use your device’s local time. Reminders invite you to check
              your log.
            </Text>
            {reminders.map(([toggle, time, label]) => (
              <View key={label} style={styles.header}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  accessibilityLabel={`${label} reminder time, HH:MM`}
                  style={[styles.input, { width: 88 }]}
                  value={String(notifs[time])}
                  onChangeText={(value) =>
                    setNotifs({ ...notifs, [time]: value })
                  }
                  placeholder="HH:MM"
                />
                <Switch
                  accessibilityLabel={`${label} reminder`}
                  value={Boolean(notifs[toggle])}
                  onValueChange={(enabled) =>
                    setNotifs({ ...notifs, [toggle]: enabled })
                  }
                />
              </View>
            ))}
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            style={styles.primary}
            onPress={() => void run(save)}
          >
            <Text style={styles.primaryText}>Save targets and reminders</Text>
          </TouchableOpacity>
          <View style={styles.card}>
            <Text style={styles.subtitle}>Data</Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.button}
              disabled={busy}
              onPress={() => void run(backup)}
            >
              <Text>
                {Platform.OS === 'web'
                  ? 'Download JSON backup'
                  : 'Share JSON backup'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.button}
              disabled={busy}
              onPress={() => setReset(true)}
            >
              <Text style={{ color: JOURNAL.error }}>
                Clear logged data for this account
              </Text>
            </TouchableOpacity>
            <Text style={styles.text}>
              Health connections and community groups are not available in this
              build.
            </Text>
            <Text style={styles.text}>Cal Tracker · Version 1.1.4</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AuthModal visible={auth} onClose={() => setAuth(false)} />
      <Modal visible={reset} transparent onRequestClose={() => setReset(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.subtitle}>Clear logged data?</Text>
            <Text style={styles.text}>
              This removes meals, weigh-ins, water logs, favorites and badges
              for the current account. Signed-in deletions will sync to the
              cloud. Export a backup first if you need these records.
            </Text>
            <View style={styles.row}>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.button}
                onPress={() => setReset(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                style={styles.button}
                onPress={() =>
                  void run(async () => {
                    await resetData();
                    setReset(false);
                    showToast(
                      'Logs cleared',
                      'Your targets and profile were kept.',
                    );
                  })
                }
              >
                <Text style={{ color: JOURNAL.error }}>Clear data</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PALETTE[50] },
  body: { padding: 24, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 8,
  },
  title: { fontFamily: FONTS.serif, fontSize: 30, color: PALETTE[950] },
  subtitle: { fontSize: 18, fontWeight: '600', color: PALETTE[950] },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: PALETTE[600],
    marginVertical: 10,
  },
  label: { fontSize: 15, flexShrink: 1, color: PALETTE[950] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  card: {
    backgroundColor: PALETTE.white,
    padding: 20,
    borderRadius: 18,
    marginVertical: 10,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
    gap: 12,
  },
  input: {
    width: 100,
    minHeight: 48,
    backgroundColor: PALETTE[50],
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
  },
  button: {
    minHeight: 44,
    minWidth: 44,
    padding: 12,
    justifyContent: 'center',
    backgroundColor: PALETTE[100],
    borderRadius: 12,
    marginVertical: 4,
  },
  active: { backgroundColor: PALETTE[300] },
  primary: {
    minHeight: 48,
    backgroundColor: PALETTE[900],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    marginVertical: 12,
  },
  primaryText: { fontSize: 16, color: 'white' },
  error: { fontSize: 14, color: JOURNAL.error, lineHeight: 21 },
  overlay: {
    flex: 1,
    backgroundColor: JOURNAL.scrim,
    padding: 24,
    justifyContent: 'center',
  },
  conflict: {
    padding: 12,
    backgroundColor: PALETTE[50],
    borderRadius: 12,
    marginVertical: 12,
  },
});

export default SettingsScreen;
