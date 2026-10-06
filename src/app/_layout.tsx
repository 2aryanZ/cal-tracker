import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { subscribeToReminderTaps } from '@/services/notificationService';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';
import { NutritionProvider, useNutrition } from '@/context/NutritionContext';
import { RewardCelebration } from '@/components/RewardCelebration';
import { NotificationToast } from '@/components/NotificationToast';
import { OnboardingModal } from '@/components/OnboardingModal';
import { PALETTE, JOURNAL } from '@/constants/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigationLayout() {
  const router = useRouter();
  useEffect(
    () =>
      subscribeToReminderTaps((data) => {
        if (data.screen === 'scan')
          router.push({
            pathname: '/(tabs)/scan',
            params: {
              mode: 'food',
              mealType: String(data.mealType ?? 'lunch'),
            },
          });
        else router.push('/(tabs)');
      }),
    [router],
  );
  const {
    rewardState,
    dismissReward,
    toastNotification,
    dismissToast,
    onboardingVisible,
    setOnboardingVisible,
    userProfile,
    saveProfile,
  } = useNutrition();

  return (
    <View style={styles.outerCanvas}>
      <View style={styles.mobileContainer}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: PALETTE[50] },
            animation: 'none',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="settings"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </Stack>

        {/* Floating In-App Push Notification Toast */}
        <NotificationToast toast={toastNotification} onDismiss={dismissToast} />

        {/* Action-to-Reward Celebration Modal */}
        <RewardCelebration
          visible={rewardState.visible}
          streak={rewardState.streak}
          title={rewardState.title}
          subtitle={rewardState.subtitle}
          caloriesAdded={rewardState.caloriesAdded}
          onDismiss={dismissReward}
        />

        {/* Scientific Onboarding / Plan Recalculator Wizard */}
        <OnboardingModal
          visible={onboardingVisible}
          onClose={() => setOnboardingVisible(false)}
          initialProfile={userProfile}
          onComplete={saveProfile}
        />
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Manrope-Regular': require('../../assets/fonts/Manrope-Regular.ttf'),
    'Manrope-SemiBold': require('../../assets/fonts/Manrope-SemiBold.ttf'),
    'Manrope-ExtraBold': require('../../assets/fonts/Manrope-ExtraBold.ttf'),
  });
  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <NutritionProvider>
        <RootNavigationLayout />
      </NutritionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outerCanvas: {
    flex: 1,
    backgroundColor: JOURNAL.canvas, // Soft neutral canvas on wide desktop
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 460 : 560,
    backgroundColor: PALETTE[50],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === 'web' ? 0.08 : 0,
    shadowRadius: 20,
    elevation: Platform.OS === 'web' ? 8 : 0,
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: PALETTE[200],
  },
});
