import React, { useState } from 'react';
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  X,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react-native';
import { PALETTE, FONTS } from '@/constants/theme';
import { useNutrition } from '@/context/NutritionContext';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSignIn?: (email: string, name?: string, password?: string) => void | Promise<void>;
  initialStep?: 1 | 2 | 3;
}

export function AuthModal({
  visible,
  onClose,
  onSignIn,
  initialStep = 3,
}: AuthModalProps) {
  const { signInWithGoogle, signInWithApple, signIn } = useNutrition();

  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'email' | 'google' | 'apple' | 'demo' | null>(null);

  const handleConnect = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setLoadingProvider('email');
    try {
      if (onSignIn) {
        await onSignIn(email, email.split('@')[0], password || undefined);
      } else {
        await signIn(email, email.split('@')[0], password || undefined);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Auth failed';
      Alert.alert('Sign In Error', msg);
    } finally {
      setIsSubmitting(false);
      setLoadingProvider(null);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'apple' | 'demo') => {
    setIsSubmitting(true);
    setLoadingProvider(provider);
    try {
      if (provider === 'google') {
        const success = await signInWithGoogle();
        if (success) {
          onClose();
        }
      } else if (provider === 'apple') {
        const success = await signInWithApple();
        if (success) {
          onClose();
        }
      } else {
        if (onSignIn) {
          await onSignIn('aryan@caltracker.app', 'Aryan');
        } else {
          await signIn('aryan@caltracker.app', 'Aryan');
        }
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Auth failed';
      if (
        msg.toLowerCase().includes('provider is not enabled') ||
        msg.toLowerCase().includes('unsupported provider')
      ) {
        Alert.alert(
          'Google Sign-In Configuration',
          'Google OAuth is not yet enabled in your Supabase Dashboard.\n\nTo enable it:\n1. Go to your Supabase Project -> Authentication -> Providers\n2. Enable Google & paste your Google Client ID\n\nIn the meantime, you can log in directly with Email & Password or Demo Login!'
        );
      } else {
        Alert.alert('Sign In Notice', msg);
      }
    } finally {
      setIsSubmitting(false);
      setLoadingProvider(null);
    }
  };


  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* ============================================================ */}
          {/* SCREEN 1: Brand Splash & Mascot */}
          {/* ============================================================ */}
          {step === 1 && (
            <View style={styles.screenOneContainer}>
              <TouchableOpacity style={styles.topCloseBtn} onPress={onClose}>
                <X size={18} color={PALETTE[50]} />
              </TouchableOpacity>

              {/* Central Mascot & Clouds Graphic */}
              <View style={styles.screenOneGraphic}>
                {/* Decorative Clouds & Glow */}
                <View style={styles.cloudLeft} />
                <View style={styles.cloudRight} />
                <View style={styles.cloudCenter} />

                {/* Sparkle Badges */}
                <View style={[styles.sparkleItem, { top: 40, left: 30 }]}>
                  <Sparkles size={14} color={PALETTE[100]} />
                </View>
                <View style={[styles.sparkleItem, { top: 90, right: 40 }]}>
                  <Sparkles size={18} color={PALETTE[100]} />
                </View>
                <View style={[styles.sparkleItem, { bottom: 80, left: 40 }]}>
                  <Sparkles size={12} color={PALETTE[100]} />
                </View>

                {/* Friendly Mascot Avatar */}
                <View style={styles.mascotCircle}>
                  <Text style={{ fontSize: 72 }}>🐼</Text>
                </View>
              </View>

              {/* Bottom Brand Title & Next Action */}
              <View style={styles.screenOneBottom}>
                <Text style={styles.brandTitleOne}>Cal tracker</Text>
                <TouchableOpacity
                  style={styles.continueBtnOne}
                  onPress={() => setStep(2)}
                  activeOpacity={0.85}>
                  <Text style={styles.continueBtnTextOne}>Get Started</Text>
                  <ArrowRight size={16} color={PALETTE[950]} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* SCREEN 2: Value Proposition & Reward Hook */}
          {/* ============================================================ */}
          {step === 2 && (
            <View style={styles.screenTwoContainer}>
              {/* Top Graphic Banner */}
              <View style={styles.screenTwoTopGraphic}>
                <TouchableOpacity style={styles.topBackBtn} onPress={() => setStep(1)}>
                  <ChevronLeft size={20} color={PALETTE[50]} />
                </TouchableOpacity>

                {/* Decorative Background Elements */}
                <View style={styles.cloudTwoLeft} />
                <View style={styles.cloudTwoRight} />
                <View style={[styles.sparkleItem, { top: 50, right: 30 }]}>
                  <Sparkles size={16} color={PALETTE[100]} />
                </View>

                {/* Hero Mascot & Athlete Figures */}
                <View style={styles.heroFiguresRow}>
                  <Text style={{ fontSize: 44 }}>🐼</Text>
                  <Text style={{ fontSize: 62, marginLeft: -10 }}>🏃‍♀️</Text>
                </View>
              </View>

              {/* Bottom White Card */}
              <View style={styles.screenTwoContent}>
                <Text style={styles.headlineTwo}>
                  Earn rewards for{'\n'}every calorie you track.
                </Text>
                <Text style={styles.subtitleTwo}>
                  More than tracking — transform daily nutrition into winning streaks and lifelong vitality.
                </Text>

                <TouchableOpacity
                  style={styles.loginBtnTwo}
                  onPress={() => setStep(3)}
                  activeOpacity={0.85}>
                  <Text style={styles.loginBtnTextTwo}>Log in</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipBtnTwo}
                  onPress={() => setStep(3)}
                  activeOpacity={0.7}>
                  <Text style={styles.skipBtnTextTwo}>Create a free account</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* SCREEN 3: Clean Luxury Log In / Connect */}
          {/* ============================================================ */}
          {step === 3 && (
            <View style={styles.screenThreeContainer}>
              {/* Top Navigation Row */}
              <View style={styles.topNavRow}>
                <TouchableOpacity
                  style={styles.backPillBtn}
                  onPress={() => {
                    if (initialStep === 3) {
                      onClose();
                    } else {
                      setStep(2);
                    }
                  }}>
                  <ChevronLeft size={18} color={PALETTE[950]} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.closePillBtn} onPress={onClose}>
                  <X size={16} color={PALETTE[950]} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollBody}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}>
                {/* Heading & Terms Notice */}
                <Text style={styles.logInHeading}>Log in</Text>
                <Text style={styles.termsSub}>
                  By logging in, you agree to our{' '}
                  <Text style={styles.termsLink}>Terms of Use</Text>.
                </Text>

                {/* Email Input Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabelText}>Email</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Your email"
                    placeholderTextColor={PALETTE[400]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.emailTextInput}
                  />
                </View>

                {/* Password Input Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabelText}>Password (Optional / Direct Auth)</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Leave empty for instant magic link"
                    placeholderTextColor={PALETTE[400]}
                    secureTextEntry
                    autoCapitalize="none"
                    style={styles.emailTextInput}
                  />
                </View>

                <Text style={styles.helperText}>
                  Instant multi-device cloud sync with Supabase PostgreSQL.
                </Text>

                {/* Primary Connect Button */}
                <TouchableOpacity
                  style={styles.connectBtn}
                  onPress={handleConnect}
                  disabled={isSubmitting}
                  activeOpacity={0.85}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={PALETTE[50]} />
                  ) : (
                    <Text style={styles.connectBtnText}>Connect with Supabase</Text>
                  )}
                </TouchableOpacity>


                {/* "──── Or ────" Divider */}
                <View style={styles.orDividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.orText}>Or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Social Sign In Buttons */}
                <View style={styles.socialButtonsList}>
                  {/* Google */}
                  <TouchableOpacity
                    style={styles.socialBtn}
                    onPress={() => handleSocialSignIn('google')}
                    disabled={isSubmitting}
                    activeOpacity={0.8}>
                    {loadingProvider === 'google' ? (
                      <ActivityIndicator size="small" color={PALETTE[950]} />
                    ) : (
                      <>
                        <View style={styles.googleIconBadge}>
                          <Text style={styles.googleIconText}>G</Text>
                        </View>
                        <Text style={styles.socialBtnText}>Sign in with Google</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Apple */}
                  <TouchableOpacity
                    style={styles.socialBtn}
                    onPress={() => handleSocialSignIn('apple')}
                    disabled={isSubmitting}
                    activeOpacity={0.8}>
                    {loadingProvider === 'apple' ? (
                      <ActivityIndicator size="small" color={PALETTE[950]} />
                    ) : (
                      <>
                        <Text style={{ fontSize: 16 }}></Text>
                        <Text style={styles.socialBtnText}>Sign in with Apple</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Quick Demo Pro Login */}
                  <TouchableOpacity
                    style={styles.demoPillBtn}
                    onPress={() => handleSocialSignIn('demo')}
                    disabled={isSubmitting}
                    activeOpacity={0.8}>
                    <ShieldCheck size={14} color={PALETTE[700]} />
                    <Text style={styles.demoPillText}>One-Tap Demo Login (Aryan • Pro)</Text>
                  </TouchableOpacity>
                </View>


                {/* Privacy Policy Footer */}
                <Text style={styles.privacyFooterText}>
                  For more information, please see our{' '}
                  <Text style={styles.privacyLink}>Privacy policy</Text>.
                </Text>
              </ScrollView>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 35, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 440 : '100%',
    backgroundColor: PALETTE[50],
    overflow: 'hidden',
  },

  // ==================== SCREEN 1 STYLES ====================
  screenOneContainer: {
    flex: 1,
    backgroundColor: '#FF6422', // Vibrant high-energy coral orange from reference
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  topCloseBtn: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenOneGraphic: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cloudLeft: {
    position: 'absolute',
    top: '15%',
    left: '5%',
    width: 100,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cloudRight: {
    position: 'absolute',
    top: '22%',
    right: '8%',
    width: 120,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  cloudCenter: {
    position: 'absolute',
    top: '32%',
    alignSelf: 'center',
    width: 160,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  sparkleItem: {
    position: 'absolute',
  },
  mascotCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  screenOneBottom: {
    alignItems: 'center',
    gap: 20,
  },
  brandTitleOne: {
    fontFamily: FONTS.serif,
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  continueBtnOne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  continueBtnTextOne: {
    fontFamily: FONTS.sans,
    fontSize: 15,
    fontWeight: '800',
    color: PALETTE[950],
  },

  // ==================== SCREEN 2 STYLES ====================
  screenTwoContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screenTwoTopGraphic: {
    height: '48%',
    backgroundColor: '#FF6422',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  topBackBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cloudTwoLeft: {
    position: 'absolute',
    top: 30,
    left: 10,
    width: 100,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cloudTwoRight: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 120,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroFiguresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  screenTwoContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  headlineTwo: {
    fontFamily: FONTS.serif,
    fontSize: 26,
    fontWeight: '800',
    color: PALETTE[950],
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  subtitleTwo: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: PALETTE[600],
    lineHeight: 18,
  },
  loginBtnTwo: {
    backgroundColor: '#FF6422', // Brand vibrant action orange from reference
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6422',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  loginBtnTextTwo: {
    fontFamily: FONTS.sans,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  skipBtnTwo: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipBtnTextTwo: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[600],
  },

  // ==================== SCREEN 3 STYLES ====================
  screenThreeContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backPillBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  closePillBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  logInHeading: {
    fontFamily: FONTS.serif,
    fontSize: 28,
    fontWeight: '800',
    color: PALETTE[950],
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  termsSub: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[600],
    marginBottom: 24,
  },
  termsLink: {
    fontWeight: '700',
    color: PALETTE[950],
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabelText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE[800],
    marginBottom: 6,
  },
  emailTextInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    fontFamily: FONTS.sans,
    color: PALETTE[950],
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  helperText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[400],
    marginBottom: 20,
  },
  connectBtn: {
    backgroundColor: '#FF6422', // Brand vibrant connect orange
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6422',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    marginBottom: 24,
  },
  connectBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  orText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[400],
  },
  socialButtonsList: {
    gap: 10,
    marginBottom: 24,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  googleIconBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  socialBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  demoPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: PALETTE[100],
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE[200],
    marginTop: 4,
  },
  demoPillText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[700],
  },
  privacyFooterText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[400],
    textAlign: 'center',
  },
  privacyLink: {
    fontWeight: '700',
    color: PALETTE[950],
  },
});
