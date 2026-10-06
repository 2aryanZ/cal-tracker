import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import X from 'lucide-react-native/icons/x';
import Svg, { Circle } from 'react-native-svg';
import { JOURNAL as C, FONTS } from '@/constants/theme';

export function ScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={tempo.header}>
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={tempo.title}>
          {title}
        </Text>
        <Text style={tempo.caption}>{subtitle}</Text>
      </View>
      {action}
    </View>
  );
}

export function EnergyDial({
  calories,
  target,
  goalMet,
}: {
  calories: number;
  target: number;
  goalMet: boolean;
}) {
  const { fontScale, width } = useWindowDimensions();
  const fraction = target > 0 ? Math.max(0, Math.min(1, calories / target)) : 0;
  const remaining = target - calories;
  const stat = (value: number, label: string) => (
    <View style={tempo.dialStat}>
      <Text style={tempo.dialStatValue}>
        {Math.round(value).toLocaleString()}
      </Text>
      <Text style={tempo.darkCaption}>{label}</Text>
    </View>
  );
  return (
    <View style={tempo.darkCard}>
      <View style={tempo.between}>
        <Text style={tempo.darkKicker}>DAILY ENERGY</Text>
        <Text style={tempo.darkTag}>
          {goalMet ? 'Within target' : `${target.toLocaleString()} kcal target`}
        </Text>
      </View>
      <View
        style={[
          tempo.dialRow,
          (fontScale > 1.3 || width < 360) && {
            flexWrap: 'wrap',
            justifyContent: 'center',
          },
        ]}
      >
        {stat(target, 'Target')}
        <View
          style={tempo.dial}
          accessible
          accessibilityLabel={`${Math.round(calories)} kilocalories recorded, target ${target}. ${Math.round(Math.abs(remaining))} ${remaining < 0 ? 'above target' : 'remaining'}.`}
        >
          <Svg
            width={156}
            height={156}
            viewBox="0 0 156 156"
            accessible={false}
          >
            <Circle
              cx={78}
              cy={78}
              r={65}
              stroke={C.darkTrack}
              strokeWidth={8}
              fill="none"
            />
            {fraction > 0 && (
              <Circle
                cx={78}
                cy={78}
                r={65}
                stroke={C.lime}
                strokeWidth={8}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${fraction * 408.41} 408.41`}
                rotation={-90}
                origin="78,78"
              />
            )}
          </Svg>
          <View style={tempo.dialCenter} pointerEvents="none">
            <Text
              style={tempo.dialNumber}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {Math.round(calories).toLocaleString()}
            </Text>
            <Text style={tempo.darkCaption}>kcal recorded</Text>
          </View>
        </View>
        {stat(
          Math.abs(remaining),
          remaining < 0 ? 'Above target' : 'Remaining',
        )}
      </View>
      <Text style={[tempo.darkCaption, { textAlign: 'center' }]}>
        Your targets. Your daily rhythm.
      </Text>
    </View>
  );
}

export function TempoSheet({
  visible,
  title,
  onClose,
  children,
  busy = false,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  busy?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={tempo.scrim}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView
          edges={['bottom']}
          style={tempo.sheet}
          accessibilityViewIsModal
        >
          <View style={tempo.sheetHandle} />
          <View
            style={[tempo.between, { paddingHorizontal: 24, paddingBottom: 8 }]}
          >
            <Text
              accessibilityRole="header"
              style={[tempo.sectionTitle, { flex: 1 }]}
            >
              {title}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Close ${title}`}
              disabled={busy}
              onPress={onClose}
              style={tempo.iconButton}
            >
              <X size={22} color={C.ink} />
            </TouchableOpacity>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={tempo.sheetBody}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const tempo = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper },
  body: {
    paddingHorizontal: Platform.OS === 'android' ? 16 : 22,
    paddingTop: 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 30,
    letterSpacing: -1,
    color: C.ink,
  },
  caption: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 19,
    color: C.muted,
  },
  text: { fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22, color: C.ink },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 17, color: C.ink },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  darkCard: {
    backgroundColor: C.ink,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
  },
  darkKicker: { fontFamily: FONTS.semibold, fontSize: 11, color: C.onDark },
  darkCaption: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    lineHeight: 18,
    color: C.onDark,
  },
  darkTag: {
    fontFamily: FONTS.semibold,
    fontSize: 10,
    color: C.lime,
    backgroundColor: C.darkTrack,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexShrink: 1,
  },
  dialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 16,
  },
  dialStat: { flex: 1, minWidth: 54, alignItems: 'center' },
  dialStatValue: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    letterSpacing: -0.5,
    color: C.surface,
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  dial: {
    width: 156,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialCenter: { position: 'absolute', alignItems: 'center', width: 114 },
  dialNumber: {
    fontFamily: FONTS.bold,
    fontSize: 34,
    letterSpacing: -1.5,
    color: C.surface,
    fontVariant: ['tabular-nums'],
  },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: C.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    minHeight: 48,
    paddingHorizontal: 16,
    backgroundColor: C.lime,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryText: { fontFamily: FONTS.bold, fontSize: 14, color: C.ink },
  secondary: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrim: {
    flex: 1,
    backgroundColor: C.scrim,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 48,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '95%',
    backgroundColor: C.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: C.line,
    borderRadius: 8,
    alignSelf: 'center',
    marginVertical: 12,
  },
  sheetBody: {
    paddingHorizontal: Platform.OS === 'android' ? 16 : 22,
    paddingBottom: 24,
  },
});
