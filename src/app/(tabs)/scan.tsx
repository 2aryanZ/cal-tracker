import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  X,
  HelpCircle,
  Zap,
  Image as ImageIcon,
  Scan,
  QrCode,
  Tag,
  Sparkles,
  SwitchCamera,
  Camera as CameraIcon,
} from 'lucide-react-native';
import { analyzeFoodImage } from '@/services/aiFoodService';
import { MealResultModal } from '@/components/MealResultModal';
import { useNutrition } from '@/context/NutritionContext';
import { AiFoodDetectionResult } from '@/types/nutrition';
import { PALETTE, FONTS } from '@/constants/theme';

const FALLBACK_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=350&q=75&auto=format&fit=crop';

export default function ScanScreen() {
  const router = useRouter();
  const { logMeal } = useNutrition();

  // Camera permissions & ref
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>(FALLBACK_FOOD_IMAGE);
  const [isScanning, setIsScanning] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'0.5x' | '1x'>('1x');
  const [scanMode, setScanMode] = useState<'food' | 'barcode' | 'label'>('food');
  const [scanResult, setScanResult] = useState<AiFoodDetectionResult | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);

  const processImage = async (imageUri: string, base64?: string) => {
    setSelectedImage(imageUri);
    setIsScanning(true);

    try {
      const result = await analyzeFoodImage(imageUri, base64);
      setScanResult(result);
      setResultModalVisible(true);
    } catch (err) {
      console.error('Scan error:', err);
      Alert.alert('Scan Failed', 'Could not analyze food image. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCapture = async () => {
    // If live camera view is active and granted
    if (cameraRef.current && permission?.granted) {
      try {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setIsScanning(true);
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.7, // Optimized quality for 3x faster AI network payload
        });

        if (photo?.uri) {
          await processImage(photo.uri, photo.base64);
          return;
        }
      } catch (err) {
        console.warn('Camera takePicture error:', err);
      } finally {
        setIsScanning(false);
      }
    }

    // Explicitly request camera permission first
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (!camPerm.granted) {
      // If camera view permission not yet requested
      if (!permission?.granted) {
        const p = await requestPermission();
        if (!p.granted) {
          Alert.alert(
            'Camera Permission Required',
            'Please allow camera access in device settings to scan your food live.'
          );
          return;
        }
      } else {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access in device settings to scan your food live.'
        );
        return;
      }
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        await processImage(result.assets[0].uri, result.assets[0].base64 || undefined);
      }
    } catch (e) {
      console.warn('Camera launch error:', e);
    }
  };

  const handlePickGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Access Required',
          'Please allow photo library access in your device settings to select food images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        await processImage(result.assets[0].uri, result.assets[0].base64 || undefined);
      }
    } catch (e) {
      console.warn('Gallery pick error:', e);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={() => router.back()}>
          <X size={18} color={PALETTE[50]} />
        </TouchableOpacity>

        <View style={styles.logoCenter}>
          <Sparkles size={16} color={PALETTE[200]} />
          <Text style={styles.topTitle}>Cal tracker</Text>
        </View>

        <TouchableOpacity style={styles.topBtn} onPress={toggleCameraFacing}>
          <SwitchCamera size={18} color={PALETTE[50]} />
        </TouchableOpacity>
      </View>

      {/* Main Viewfinder Frame */}
      <View style={styles.viewfinderContainer}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            enableTorch={torch}
          />
        ) : (
          <View style={styles.permissionFallback}>
            <Image
              source={{ uri: selectedImage }}
              style={StyleSheet.absoluteFillObject}
              cachePolicy="memory-disk"
              transition={150}
            />
            <View style={styles.permissionPrompt}>
              <CameraIcon size={32} color={PALETTE[50]} />
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionSub}>
                Enable camera to snap live food photos and get instant calorie recognition
              </Text>
              <TouchableOpacity
                style={styles.grantPermissionBtn}
                onPress={requestPermission}
                activeOpacity={0.85}>
                <Text style={styles.grantPermissionBtnText}>Allow Camera Access</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Monochrome AI Food Tag Pins */}
        <View style={[styles.aiPin, styles.pinLettuce]}>
          <Text style={styles.pinText}>Visual AI Vision</Text>
          <View style={styles.pinDot} />
        </View>

        {/* Zoom Selector Pills (.5x, 1x) */}
        <View style={styles.zoomRow}>
          <TouchableOpacity
            style={[styles.zoomPill, zoomLevel === '0.5x' && styles.zoomPillActive]}
            onPress={() => setZoomLevel('0.5x')}>
            <Text style={[styles.zoomText, zoomLevel === '0.5x' && styles.zoomTextActive]}>.5x</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.zoomPill, zoomLevel === '1x' && styles.zoomPillActive]}
            onPress={() => setZoomLevel('1x')}>
            <Text style={[styles.zoomText, zoomLevel === '1x' && styles.zoomTextActive]}>1x</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Camera Controls Overlay */}
        <View style={styles.bottomControlsOverlay}>
          {/* Mode Selector Tabs (Scan Food, Barcode, Food Label) */}
          <View style={styles.modeTabsRow}>
            <TouchableOpacity
              style={[styles.modeTab, scanMode === 'food' && styles.modeTabActive]}
              onPress={() => setScanMode('food')}>
              <Scan size={13} color={scanMode === 'food' ? PALETTE[950] : PALETTE[300]} />
              <Text style={[styles.modeTabText, scanMode === 'food' && styles.modeTabTextActive]}>
                Scan Food
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, scanMode === 'barcode' && styles.modeTabActive]}
              onPress={() => setScanMode('barcode')}>
              <QrCode size={13} color={scanMode === 'barcode' ? PALETTE[950] : PALETTE[300]} />
              <Text style={[styles.modeTabText, scanMode === 'barcode' && styles.modeTabTextActive]}>
                Barcode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, scanMode === 'label' && styles.modeTabActive]}
              onPress={() => setScanMode('label')}>
              <Tag size={13} color={scanMode === 'label' ? PALETTE[950] : PALETTE[300]} />
              <Text style={[styles.modeTabText, scanMode === 'label' && styles.modeTabTextActive]}>
                Food Label
              </Text>
            </TouchableOpacity>
          </View>

          {/* Shutter Button Row */}
          <View style={styles.shutterRow}>
            <TouchableOpacity
              style={[styles.shutterSideBtn, torch && styles.shutterSideBtnActive]}
              onPress={() => setTorch(!torch)}>
              <Zap size={20} color={torch ? PALETTE[950] : PALETTE[50]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shutterOuter}
              onPress={handleCapture}
              disabled={isScanning}
              activeOpacity={0.85}>
              <View style={styles.shutterInner}>
                {isScanning && <ActivityIndicator size="small" color={PALETTE[950]} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shutterSideBtn} onPress={handlePickGallery}>
              <ImageIcon size={20} color={PALETTE[50]} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Result & Breakdown Modal */}
      <MealResultModal
        visible={resultModalVisible}
        onClose={() => setResultModalVisible(false)}
        result={scanResult}
        imageUri={selectedImage}
        onConfirm={(item) => {
          logMeal({
            name: item.name,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            mealType: item.mealType,
            portionSize: item.portionSize,
            imageUri: item.imageUri,
            isAiGenerated: true,
          });
          router.replace('/(tabs)');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE[950],
    paddingTop: Platform.OS === 'android' ? 36 : 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(218, 237, 235, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topTitle: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE[50],
  },
  viewfinderContainer: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'ios' ? 18 : 12,
  },
  permissionFallback: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionPrompt: {
    backgroundColor: 'rgba(16, 33, 35, 0.85)',
    padding: 24,
    borderRadius: 18,
    alignItems: 'center',
    marginHorizontal: 24,
    gap: 8,
  },
  permissionTitle: {
    fontFamily: FONTS.serif,
    fontSize: 17,
    fontWeight: '700',
    color: PALETTE[50],
    textAlign: 'center',
  },
  permissionSub: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[200],
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  grantPermissionBtn: {
    backgroundColor: PALETTE.white,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  grantPermissionBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[950],
  },
  aiPin: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 249, 248, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: PALETTE[200],
    shadowColor: PALETTE[950],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pinText: {
    fontFamily: FONTS.serif,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[950],
  },
  pinDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: PALETTE[700],
  },
  pinLettuce: {
    top: '18%',
    left: '8%',
  },
  zoomRow: {
    position: 'absolute',
    bottom: 124,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 33, 35, 0.65)',
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  zoomPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  zoomPillActive: {
    backgroundColor: PALETTE.white,
  },
  zoomText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[200],
  },
  zoomTextActive: {
    color: PALETTE[950],
  },
  bottomControlsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(16, 33, 35, 0.75)',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modeTabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(218, 237, 235, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modeTabActive: {
    backgroundColor: PALETTE.white,
  },
  modeTabText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE[300],
  },
  modeTabTextActive: {
    color: PALETTE[950],
    fontWeight: '700',
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  shutterSideBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(218, 237, 235, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterSideBtnActive: {
    backgroundColor: PALETTE.white,
  },
  shutterOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3.5,
    borderColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
