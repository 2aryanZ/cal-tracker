import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import X from 'lucide-react-native/icons/x';
import Utensils from 'lucide-react-native/icons/utensils';
import Mail from 'lucide-react-native/icons/mail';
import Lock from 'lucide-react-native/icons/lock';
import UserIcon from 'lucide-react-native/icons/user';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Shield from 'lucide-react-native/icons/shield';

import { PALETTE, FONTS, JOURNAL } from '@/constants/theme';
import { useNutrition } from '@/context/NutritionContext';
import {
  triggerLightImpact,
  triggerSuccessFeedback,
} from '@/services/hapticsService';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  initialStep?: 1 | 2 | 3;
}

export function AuthModal({ visible, onClose }: AuthModalProps) {
  const { signIn, signInWithGoogle } = useNutrition();

  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<
    'email' | 'google' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleConnect = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    setLoadingProvider('google');
    try {
      if (await signInWithGoogle()) onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to connect to Google. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
      setLoadingProvider(null);
    }
  };

  const handleEmailConnect = async () => {
    setErrorMessage(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Your password must contain at least 6 characters.');
      return;
    }
    setIsSubmitting(true);
    setLoadingProvider('email');
    try {
      const confirmed = await signIn(email, name, password, isSignUpMode);
      if (confirmed) {
        triggerSuccessFeedback();
        onClose();
      } else {
        setIsSignUpMode(false);
        setErrorMessage(
          'Check your email to confirm your account, then sign in.',
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to sign in. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
      setLoadingProvider(null);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.cardContainer}>
          {/* Header Bar */}
          <View style={styles.topNavRow}>
            <View style={styles.brandTitleRow}>
              <View style={styles.logoBadge}>
                <Utensils size={16} color={PALETTE[50]} />
              </View>
              <Text style={styles.brandTitle}>Cal Tracker Account</Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close account sign-in"
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <X size={18} color={PALETTE[950]} />
            </TouchableOpacity>
          </View>

          {/* Auth Method Switcher Tabs */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.switchTab,
                authMethod === 'google' && styles.switchTabActive,
              ]}
              onPress={() => {
                triggerLightImpact();
                setErrorMessage(null);
                setAuthMethod('google');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.googleTabIcon}>G</Text>
              <Text
                style={[
                  styles.switchTabText,
                  authMethod === 'google' && styles.switchTabTextActive,
                ]}
              >
                Google Sign-In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.switchTab,
                authMethod === 'email' && styles.switchTabActive,
              ]}
              onPress={() => {
                triggerLightImpact();
                setErrorMessage(null);
                setAuthMethod('email');
              }}
              activeOpacity={0.8}
            >
              <Mail
                size={15}
                color={authMethod === 'email' ? PALETTE[950] : PALETTE[500]}
              />
              <Text
                style={[
                  styles.switchTabText,
                  authMethod === 'email' && styles.switchTabTextActive,
                ]}
              >
                Email & Password
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* ============================================================ */}
            {/* TAB 1: GOOGLE CONNECT */}
            {/* ============================================================ */}
            {authMethod === 'google' ? (
              <View style={styles.tabContent}>
                <View style={styles.googleHeroBox}>
                  <View style={styles.googleIconBadgeLarge}>
                    <Text style={styles.googleIconTextLarge}>G</Text>
                  </View>
                  <Text style={styles.heroTitle}>Continue with Google</Text>
                  <Text style={styles.heroSub}>
                    Sign in with your Google account to back up meal logs, water
                    tracker, and streaks to your account.
                  </Text>
                </View>

                {/* Primary Google Button */}
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.primaryGoogleBtn}
                  onPress={handleGoogleConnect}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {loadingProvider === 'google' ? (
                    <ActivityIndicator size="small" color={PALETTE[50]} />
                  ) : (
                    <>
                      <View style={styles.googleBtnBadge}>
                        <Text style={styles.googleBtnBadgeText}>G</Text>
                      </View>
                      <Text style={styles.primaryGoogleBtnText}>
                        Sign In with Google
                      </Text>
                      <ArrowRight size={16} color={PALETTE[50]} />
                    </>
                  )}
                </TouchableOpacity>

                {/* Features list */}
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <CheckCircle2 size={14} color={PALETTE[700]} />
                    <Text style={styles.featureText}>
                      Instant cloud backup to Supabase
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <CheckCircle2 size={14} color={PALETTE[700]} />
                    <Text style={styles.featureText}>
                      Choose your account securely with Google
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Shield size={14} color={PALETTE[700]} />
                    <Text style={styles.featureText}>
                      Sync across your signed-in devices
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              /* ============================================================ */
              /* TAB 2: EMAIL & PASSWORD CONNECT */
              /* ============================================================ */
              <View style={styles.tabContent}>
                <View style={styles.googleHeroBox}>
                  <Text style={styles.heroTitle}>
                    {isSignUpMode
                      ? 'Create Free Account'
                      : 'Sign In with Email'}
                  </Text>
                  <Text style={styles.heroSub}>
                    {isSignUpMode
                      ? 'Sign up to protect your calories, water logs, and streak across devices.'
                      : 'Welcome back! Enter your password to load your cloud meal history.'}
                  </Text>
                </View>

                {/* Sub-mode selector */}
                <View style={styles.subModePills}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[
                      styles.subModePill,
                      !isSignUpMode && styles.subModePillActive,
                    ]}
                    onPress={() => {
                      setIsSignUpMode(false);
                      setErrorMessage(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.subModePillText,
                        !isSignUpMode && styles.subModePillTextActive,
                      ]}
                    >
                      Sign In
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[
                      styles.subModePill,
                      isSignUpMode && styles.subModePillActive,
                    ]}
                    onPress={() => {
                      setIsSignUpMode(true);
                      setErrorMessage(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.subModePillText,
                        isSignUpMode && styles.subModePillTextActive,
                      ]}
                    >
                      Create Account
                    </Text>
                  </TouchableOpacity>
                </View>

                {isSignUpMode && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <View style={styles.inputBox}>
                      <UserIcon size={16} color={PALETTE[500]} />
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Alex Taylor"
                        placeholderTextColor={PALETTE[400]}
                        style={styles.inputField}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputBox}>
                    <Mail size={16} color={PALETTE[500]} />
                    <TextInput
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="e.g. alex.nutrition@gmail.com"
                      placeholderTextColor={PALETTE[400]}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.inputField}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputBox}>
                    <Lock size={16} color={PALETTE[500]} />
                    <TextInput
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="At least 6 characters"
                      placeholderTextColor={PALETTE[400]}
                      secureTextEntry
                      autoCapitalize="none"
                      style={styles.inputField}
                    />
                  </View>
                </View>

                {/* Primary Button */}
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.primaryBtn}
                  onPress={handleEmailConnect}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {loadingProvider === 'email' ? (
                    <ActivityIndicator size="small" color={PALETTE.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {isSignUpMode
                        ? 'Create Free Account'
                        : 'Sign In with Email'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Toggle Sign Up / Sign In */}
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.toggleModeBtn}
                  onPress={() => {
                    setIsSignUpMode(!isSignUpMode);
                    setErrorMessage(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleModeText}>
                    {isSignUpMode
                      ? 'Already have an account? Sign In'
                      : "Don't have an account? Create one"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Skip / Guest Mode */}
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.guestBtn}
              onPress={onClose}
              activeOpacity={0.6}
            >
              <Text style={styles.guestBtnText}>
                Continue as Guest / Skip for now
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: JOURNAL.scrim,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 460 : '100%',
    height: '84%',
    backgroundColor: PALETTE[50],
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE[100],
    backgroundColor: PALETTE.white,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: PALETTE[950],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE[950],
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: PALETTE[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: PALETTE[100],
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  switchTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
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
  googleTabIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EA4335',
  },
  switchTabText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE[600],
  },
  switchTabTextActive: {
    color: PALETTE[950],
    fontWeight: '700',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  tabContent: {
    width: '100%',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 18,
    fontWeight: '500',
  },
  googleHeroBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  googleIconBadgeLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PALETTE.white,
    borderWidth: 1.5,
    borderColor: PALETTE[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  googleIconTextLarge: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4285F4',
  },
  heroTitle: {
    fontFamily: FONTS.serif,
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE[950],
    marginBottom: 4,
    textAlign: 'center',
  },
  heroSub: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 18,
    color: PALETTE[600],
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  primaryGoogleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE[950],
    height: 52,
    borderRadius: 14,
    gap: 10,
    marginTop: 6,
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  googleBtnBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4285F4',
  },
  primaryGoogleBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[50],
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[800],
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.white,
    borderWidth: 1.5,
    borderColor: PALETTE[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  inputField: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: PALETTE[950],
  },
  featuresList: {
    backgroundColor: PALETTE.white,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[700],
    fontWeight: '500',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE[950],
    height: 50,
    borderRadius: 14,
    gap: 8,
    marginTop: 6,
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[50],
  },
  subModePills: {
    flexDirection: 'row',
    backgroundColor: PALETTE[100],
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  subModePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  subModePillActive: {
    backgroundColor: PALETTE.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  subModePillText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE[600],
  },
  subModePillTextActive: {
    color: PALETTE[950],
    fontWeight: '700',
  },
  toggleModeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  toggleModeText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE[700],
  },
  guestBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },
  guestBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE[500],
    textDecorationLine: 'underline',
  },
});
