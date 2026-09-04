import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Mic, MicOff, Sparkles, X, ArrowRight, Volume2, Check } from 'lucide-react-native';
import { parseVoiceMealTranscript } from '@/services/mealPlanService';
import { AiFoodDetectionResult, MealType } from '@/types/nutrition';
import { PALETTE, FONTS } from '@/constants/theme';
import { triggerLightImpact, triggerSuccessFeedback } from '@/services/hapticsService';

interface VoiceLogModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (result: AiFoodDetectionResult, mealType: MealType) => void;
  defaultMealType?: MealType;
}

const SAMPLE_VOICE_PROMPTS = [
  '2 scrambled eggs with sourdough toast and an iced latte',
  'Grilled salmon with quinoa and steamed asparagus',
  'Chicken burrito bowl with brown rice and guacamole',
  '1 scoop whey protein shake with banana and peanut butter',
];

export function VoiceLogModal({
  visible,
  onClose,
  onConfirm,
  defaultMealType = 'lunch',
}: VoiceLogModalProps) {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>(defaultMealType);
  const [parsedResult, setParsedResult] = useState<AiFoodDetectionResult | null>(null);

  useEffect(() => {
    if (visible) {
      setTranscript('');
      setIsListening(false);
      setIsParsing(false);
      setParsedResult(null);
      setActiveMealType(defaultMealType);
    }
  }, [visible, defaultMealType]);

  const handleStartListening = () => {
    triggerLightImpact();
    setIsListening(true);
    setParsedResult(null);

    // Simulate realistic speech recognition listening
    setTimeout(() => {
      const sample = SAMPLE_VOICE_PROMPTS[Math.floor(Math.random() * SAMPLE_VOICE_PROMPTS.length)];
      setTranscript(sample);
      setIsListening(false);
      handleProcessTranscript(sample);
    }, 2000);
  };

  const handleProcessTranscript = async (textToParse?: string) => {
    const text = textToParse || transcript;
    if (!text.trim()) return;

    triggerLightImpact();
    setIsParsing(true);
    try {
      const result = await parseVoiceMealTranscript(text, activeMealType);
      triggerSuccessFeedback();
      setParsedResult(result);
    } catch (err) {
      console.error('Voice parsing error:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleLogParsedMeal = () => {
    if (!parsedResult) return;
    triggerSuccessFeedback();
    onConfirm(parsedResult, activeMealType);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.micIconBox}>
                <Mic size={16} color={PALETTE[50]} />
              </View>
              <View>
                <Text style={styles.title}>Voice Food Logger</Text>
                <Text style={styles.subtitle}>Speak or type your meal in plain English</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={PALETTE[600]} />
            </TouchableOpacity>
          </View>

          {/* Meal Slot Selector */}
          <View style={styles.mealSlotRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[styles.slotPill, activeMealType === slot && styles.slotPillActive]}
                onPress={() => setActiveMealType(slot)}>
                <Text style={[styles.slotPillText, activeMealType === slot && styles.slotPillTextActive]}>
                  {slot.charAt(0).toUpperCase() + slot.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Voice Mic Orb Button */}
          <View style={styles.micSection}>
            <TouchableOpacity
              style={[styles.micOrb, isListening && styles.micOrbActive]}
              onPress={handleStartListening}
              activeOpacity={0.85}>
              {isListening ? (
                <ActivityIndicator size="large" color={PALETTE[50]} />
              ) : (
                <Mic size={32} color={PALETTE[50]} />
              )}
            </TouchableOpacity>
            <Text style={styles.micHintText}>
              {isListening ? 'Listening... Speak your meal now' : 'Tap mic to speak or select a quick prompt below'}
            </Text>
          </View>

          {/* Transcript Input / Edit */}
          <View style={styles.inputContainer}>
            <TextInput
              value={transcript}
              onChangeText={setTranscript}
              placeholder="e.g. 2 eggs on toast with coffee..."
              placeholderTextColor={PALETTE[400]}
              style={styles.textInput}
              multiline
            />
            {transcript.length > 0 && !parsedResult && (
              <TouchableOpacity
                style={styles.parseBtn}
                onPress={() => handleProcessTranscript()}
                disabled={isParsing}>
                {isParsing ? (
                  <ActivityIndicator size="small" color={PALETTE[50]} />
                ) : (
                  <>
                    <Sparkles size={12} color={PALETTE[50]} />
                    <Text style={styles.parseBtnText}>Parse with AI</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Prompts Shelf */}
          {!parsedResult && (
            <View style={styles.promptsSection}>
              <Text style={styles.promptsLabel}>QUICK SPEECH PROMPTS</Text>
              <View style={styles.promptsGrid}>
                {SAMPLE_VOICE_PROMPTS.map((prompt, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.promptPill}
                    onPress={() => {
                      setTranscript(prompt);
                      handleProcessTranscript(prompt);
                    }}>
                    <Volume2 size={11} color={PALETTE[600]} />
                    <Text style={styles.promptText} numberOfLines={1}>
                      {prompt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Parsed Result Preview Card */}
          {parsedResult && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultFoodName}>{parsedResult.foodName}</Text>
                <View style={styles.calsPill}>
                  <Text style={styles.calsPillText}>{parsedResult.calories} kcal</Text>
                </View>
              </View>

              <View style={styles.macroPillsRow}>
                <View style={styles.macroPill}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroVal}>{parsedResult.protein}g</Text>
                </View>
                <View style={styles.macroPill}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroVal}>{parsedResult.carbs}g</Text>
                </View>
                <View style={styles.macroPill}>
                  <Text style={styles.macroLabel}>Fats</Text>
                  <Text style={styles.macroVal}>{parsedResult.fats}g</Text>
                </View>
              </View>

              {/* Confirm & Log Button */}
              <TouchableOpacity
                style={styles.confirmLogBtn}
                onPress={handleLogParsedMeal}
                activeOpacity={0.85}>
                <Check size={16} color={PALETTE[50]} />
                <Text style={styles.confirmLogBtnText}>
                  Log to {activeMealType.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 35, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: PALETTE.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  micIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PALETTE[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 17,
    fontWeight: '700',
    color: PALETTE[950],
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealSlotRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  slotPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  slotPillActive: {
    backgroundColor: PALETTE[950],
    borderColor: PALETTE[950],
  },
  slotPillText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE[600],
  },
  slotPillTextActive: {
    color: PALETTE[50],
    fontWeight: '700',
  },
  micSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  micOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PALETTE[900],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
  },
  micOrbActive: {
    backgroundColor: '#DC2626',
  },
  micHintText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    textAlign: 'center',
  },
  inputContainer: {
    backgroundColor: PALETTE[50],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: PALETTE[200],
    marginBottom: 12,
  },
  textInput: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: PALETTE[950],
    minHeight: 44,
  },
  parseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: PALETTE[950],
    borderRadius: 8,
    paddingVertical: 7,
    marginTop: 6,
  },
  parseBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[50],
  },
  promptsSection: {
    marginBottom: 12,
  },
  promptsLabel: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '800',
    color: PALETTE[500],
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  promptsGrid: {
    gap: 6,
  },
  promptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PALETTE[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  promptText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[800],
    flex: 1,
  },
  resultCard: {
    backgroundColor: '#F8FCFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultFoodName: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[950],
    flex: 1,
  },
  calsPill: {
    backgroundColor: PALETTE[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  calsPillText: {
    fontFamily: FONTS.serif,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[900],
  },
  macroPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  macroPill: {
    flex: 1,
    backgroundColor: PALETTE.white,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  macroLabel: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    color: PALETTE[500],
    fontWeight: '600',
  },
  macroVal: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
    marginTop: 2,
  },
  confirmLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: PALETTE[950],
    borderRadius: 10,
    paddingVertical: 10,
  },
  confirmLogBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[50],
  },
});
