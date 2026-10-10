import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  useRouter,
  useLocalSearchParams,
  usePathname,
  useFocusEffect,
} from 'expo-router';

import X from 'lucide-react-native/icons/x';
import Zap from 'lucide-react-native/icons/zap';
import ImageIcon from 'lucide-react-native/icons/image';
import Scan from 'lucide-react-native/icons/scan';
import QrCode from 'lucide-react-native/icons/qr-code';
import Tag from 'lucide-react-native/icons/tag';
import SwitchCamera from 'lucide-react-native/icons/switch-camera';
import CameraIcon from 'lucide-react-native/icons/camera';
import Flame from 'lucide-react-native/icons/flame';
import {
  analyzeFoodImage,
  analyzeNutritionLabelImage,
} from '@/services/aiFoodService';
import { fetchProductByBarcode } from '@/services/barcodeService';
import { MealResultModal } from '@/components/MealResultModal';
import { AuthModal } from '@/components/AuthModal';
import { createScanSession } from '@/services/scanSession';
import { prepareMealPhoto, type MealPhotoInput, type PreparedMealPhoto } from '@/services/mealPhotoService';
import { NutritionRequestError } from '@/services/nutritionApi';
import { getTodayDateString } from '@/services/storage';
import { useNutrition } from '@/context/NutritionContext';
import { AiFoodDetectionResult, MealType, FoodEntry } from '@/types/nutrition';
import { PALETTE, FONTS, JOURNAL } from '@/constants/theme';
import {
  triggerLightImpact,
  triggerSelection,
  triggerSuccessFeedback,
} from '@/services/hapticsService';

export default function ScanScreen() {
  const { userAccount } = useNutrition();
  const owner = userAccount.isLoggedIn ? userAccount.id : null;
  // Remount all photo/form state when accounts change, including any in-flight picker.
  return <AccountScanner key={owner ?? 'guest'} accountOwner={owner} />;
}
function AccountScanner({ accountOwner }: { accountOwner: string | null }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; mealType?: string }>();
  const isFocused = usePathname().endsWith('/scan');
  const { logMeal } = useNutrition();
  const focused = useRef(isFocused);
  useLayoutEffect(() => { focused.current = isFocused; }, [isFocused]);
  const [scanSession] = useState(createScanSession);
  const lastPhoto = useRef<MealPhotoInput | null>(null);
  const preparedPhoto = useRef<PreparedMealPhoto | null>(null);
  const draftOwner = useRef<string | null>(accountOwner);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [phase, setPhase] = useState<'capture' | 'preparing' | 'analyzing' | 'lookup' | null>(null);
  const isScanning = phase !== null;
  const [scanError, setScanError] = useState('');
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'2x' | '1x'>('1x');
  const [scanMode, setScanMode] = useState<'food' | 'barcode' | 'label'>('food');
  const [scanResult, setScanResult] = useState<AiFoodDetectionResult | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultSource, setResultSource] = useState<FoodEntry['source']>('photo');
  const mealType: MealType = ['breakfast', 'lunch', 'dinner', 'snack'].includes(params.mealType ?? '')
    ? (params.mealType as MealType) : 'lunch';
  const lastScannedBarcodeRef = useRef<string | null>(null);

  useFocusEffect(useCallback(() => {
    scanSession.cancel();
    setPhase(null);
    setCameraReady(false);
    setScanMode(params.mode === 'barcode' ? 'barcode' : params.mode === 'label' ? 'label' : 'food');
    setScanResult(null);
    setResultModalVisible(false);
    setSelectedImage('');
    setScanError('');
    setNeedsSignIn(false);
    setCanRetry(false);
    lastPhoto.current = null;
    preparedPhoto.current = null;
    lastScannedBarcodeRef.current = null;
    return () => { scanSession.cancel(); lastPhoto.current = null; preparedPhoto.current = null; };
  }, [params.mode, scanSession]));

  const currentTask = (task: AbortController, owner: string | null) =>
    scanSession.isCurrent(task) && focused.current && accountOwner === owner;
  const cancelAnalysis = () => {
    scanSession.cancel();
    setPhase(null);
    setScanError('Analysis cancelled. Retake the photo or enter nutrition manually.');
    setNeedsSignIn(false);
  };
  const resetPhoto = () => {
    scanSession.cancel();
    setPhase(null);
    setScanResult(null);
    setResultModalVisible(false);
    setSelectedImage('');
    setScanError('');
    setNeedsSignIn(false);
    setCanRetry(false);
    lastPhoto.current = null;
    preparedPhoto.current = null;
    lastScannedBarcodeRef.current = null;
  };
  const chooseMode = (mode: 'food' | 'barcode' | 'label') => {
    resetPhoto();
    setScanMode(mode);
  };
  const enterManually = () => {
    scanSession.cancel();
    setPhase(null);
    setScanResult(null);
    setResultSource('manual');
    draftOwner.current = accountOwner;
    setResultModalVisible(true);
  };
  const showFailure = (error: unknown) => {
    setNeedsSignIn(error instanceof NutritionRequestError && error.code === 'session');
    setScanError(error instanceof Error ? error.message : 'Unable to analyze this photo. Try another photo or enter nutrition manually.');
  };
  const processPhoto = async (acquire: (signal: AbortSignal) => Promise<MealPhotoInput | null>, retry = false) => {
    if (!isFocused || resultModalVisible) return;
    if (!accountOwner) {
      setNeedsSignIn(true);
      setScanError('Sign in to estimate a meal from a photo. Manual meal entry is also available.');
      return;
    }
    const task = scanSession.begin();
    if (!task) return;
    const owner = accountOwner;
    const mode = scanMode;
    setPhase('capture');
    setScanError('');
    setNeedsSignIn(false);
    try {
      const photo = await acquire(task.signal);
      if (!photo || !currentTask(task, owner)) return;
      lastPhoto.current = photo;
      setCanRetry(true);
      setSelectedImage(photo.uri);
      setPhase('preparing');
      if (!retry) preparedPhoto.current = null;
      const prepared = preparedPhoto.current ?? await prepareMealPhoto(photo, task.signal, mode === 'food' ? 1280 : 1600);
      if (!currentTask(task, owner)) return;
      preparedPhoto.current = prepared;
      setSelectedImage(prepared.uri);
      setPhase('analyzing');
      const analyze = mode === 'food' ? analyzeFoodImage : analyzeNutritionLabelImage;
      const result = await analyze(prepared.uri, prepared.base64, prepared.mimeType, task.signal, owner);
      if (!currentTask(task, owner)) return;
      preparedPhoto.current = null;
      lastPhoto.current = null;
      setCanRetry(false);
      triggerSuccessFeedback();
      draftOwner.current = owner;
      setResultSource(mode === 'food' ? 'photo' : 'label');
      setScanResult(result);
      setResultModalVisible(true);
    } catch (error) {
      if (currentTask(task, owner)) showFailure(error);
    } finally {
      if (scanSession.isCurrent(task)) {
        scanSession.finish(task);
        setPhase(null);
      }
    }
  };
  const handleCapture = () => {
    if (scanMode === 'barcode') return;
    void processPhoto(async (signal) => {
      triggerLightImpact();
      if (cameraRef.current && permission?.granted) {
        if (!cameraReady) throw new Error('The camera is still getting ready. Try again in a moment.');
        return await cameraRef.current.takePictureAsync({ quality: 0.85 });
      }
      if (Platform.OS === 'web') throw new Error('Allow camera access, or choose a meal photo from your library.');
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (signal.aborted) return null;
      if (!cameraPermission.granted) throw new Error('Allow camera access in device settings, or choose a meal photo from your library.');
      const picture = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
      return picture.canceled ? null : picture.assets[0];
    });
  };
  const handlePickGallery = () => {
    void processPhoto(async () => {
      // The system photo picker grants access to the selected image; no broad library permission is needed.
      const picture = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      return picture.canceled ? null : picture.assets[0];
    });
  };
  const handleBarcodeScanned = async (event: { data: string; type: string }) => {
    const rawCode = event?.data;
    if (!rawCode || !isFocused || resultModalVisible || lastScannedBarcodeRef.current === rawCode) return;
    const task = scanSession.begin();
    if (!task) return;
    const owner = accountOwner;
    lastScannedBarcodeRef.current = rawCode;
    setScanError('');
    setNeedsSignIn(false);
    setPhase('lookup');
    try {
      setSelectedImage('');
      const product = await fetchProductByBarcode(rawCode, task.signal);
      if (!currentTask(task, owner)) return;
      if (!product) throw new Error('This barcode was not found. Try the nutrition label or enter the values manually.');
      draftOwner.current = owner;
      setResultSource('barcode');
      setScanResult(product);
      setResultModalVisible(true);
      triggerSuccessFeedback();
    } catch (error) {
      if (currentTask(task, owner)) showFailure(error);
    } finally {
      if (scanSession.isCurrent(task)) {
        scanSession.finish(task);
        setPhase(null);
      }
    }
  };

  const toggleCameraFacing = () => {
    triggerSelection();
    setCameraReady(false);
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scannerBody}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
          style={styles.topBtn}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/(tabs)')
          }
        >
          <X size={18} color={PALETTE[50]} />
        </TouchableOpacity>

        <View style={styles.logoCenter}>
          <View style={styles.fitnessBadge}>
            <Flame size={13} color={JOURNAL.accent} />
          </View>
          <Text style={styles.topTitle}>
            {scanMode === 'barcode'
              ? 'Barcode Scanner'
              : scanMode === 'label'
                ? 'Nutrition label'
                : 'Photo to meal'}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Switch camera"
          style={styles.topBtn}
          disabled={isScanning}
          onPress={toggleCameraFacing}
        >
          <SwitchCamera size={18} color={PALETTE[50]} />
        </TouchableOpacity>
      </View>

      <Text style={styles.guidance}>
        {scanMode === 'food'
          ? 'Take a clear meal photo. AI fills the portion and nutrition for you to review.'
          : scanMode === 'label'
            ? 'Photograph the full nutrition label. Review the recognized serving and values.'
            : 'Scan the product barcode, then review its serving and nutrition.'}
      </Text>
      {/* Main Viewfinder Frame */}
      <View style={styles.viewfinderContainer}>
        {permission?.granted && isFocused ? (
          <CameraView
            ref={cameraRef}
            onCameraReady={() => setCameraReady(true)}
            onMountError={() => showFailure(new Error('The camera could not open. Choose a photo from your library or enter nutrition manually.'))}
            style={StyleSheet.absoluteFill}
            facing={facing}
            active={isFocused && !resultModalVisible}
            zoom={zoomLevel === '2x' ? 0.25 : 0}
            enableTorch={torch}
            barcodeScannerSettings={
              scanMode === 'barcode'
                ? {
                    barcodeTypes: [
                      'ean13',
                      'ean8',
                      'upc_a',
                      'upc_e',
                      'code128',
                      'code39',
                      'codabar',
                      'itf14',
                      'datamatrix',
                      'pdf417',
                    ],
                  }
                : undefined
            }
            onBarcodeScanned={
              scanMode === 'barcode' &&
              isFocused &&
              !resultModalVisible &&
              !isScanning
                ? handleBarcodeScanned
                : undefined
            }
          />
        ) : (
          <View style={styles.permissionFallback}>
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={StyleSheet.absoluteFill}
                cachePolicy="memory-disk"
              />
            ) : null}
            <View style={styles.permissionPrompt}>
              <CameraIcon size={32} color={PALETTE[50]} />
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionSub}>
                Enable your camera for barcodes and food photos. Review
                estimates before logging.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.grantPermissionBtn}
                onPress={requestPermission}
                activeOpacity={0.85}
              >
                <Text style={styles.grantPermissionBtnText}>
                  Allow Camera Access
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Scan Mode Overlays & Reticles */}
        {scanMode === 'food' && (
          <View style={[styles.aiPin, styles.pinLettuce]}>
            <Text style={styles.pinText}>AI photo estimate</Text>
            <View style={styles.pinDot} />
          </View>
        )}

        {/* Barcode Frame Reticle Overlay */}
        {scanMode === 'barcode' && (
          <View style={styles.reticleOverlayContainer} pointerEvents="none">
            <View style={styles.barcodeFrame}>
              <View style={[styles.cornerBracket, styles.cornerTopLeft]} />
              <View style={[styles.cornerBracket, styles.cornerTopRight]} />
              <View style={[styles.cornerBracket, styles.cornerBottomLeft]} />
              <View style={[styles.cornerBracket, styles.cornerBottomRight]} />
              <View style={styles.laserLine} />
            </View>
            <Text style={styles.reticleInstructionText}>
              Align barcode within the frame
            </Text>
          </View>
        )}

        {/* Nutrition Label Frame Reticle Overlay */}
        {scanMode === 'label' && (
          <View style={styles.reticleOverlayContainer} pointerEvents="none">
            <View style={styles.labelFrame}>
              <View style={[styles.cornerBracket, styles.cornerTopLeft]} />
              <View style={[styles.cornerBracket, styles.cornerTopRight]} />
              <View style={[styles.cornerBracket, styles.cornerBottomLeft]} />
              <View style={[styles.cornerBracket, styles.cornerBottomRight]} />
            </View>
            <Text style={styles.reticleInstructionText}>
              Position Nutrition Facts label in frame
            </Text>
          </View>
        )}

        {/* Zoom Selector Pills (.5x, 1x) */}
        <View style={styles.zoomRow}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.zoomPill,
              zoomLevel === '2x' && styles.zoomPillActive,
            ]}
            onPress={() => {
              triggerSelection();
              setZoomLevel('2x');
            }}
          >
            <Text
              style={[
                styles.zoomText,
                zoomLevel === '2x' && styles.zoomTextActive,
              ]}
            >
              2x
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.zoomPill,
              zoomLevel === '1x' && styles.zoomPillActive,
            ]}
            onPress={() => {
              triggerSelection();
              setZoomLevel('1x');
            }}
          >
            <Text
              style={[
                styles.zoomText,
                zoomLevel === '1x' && styles.zoomTextActive,
              ]}
            >
              1x
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Camera Controls Overlay */}
        <View style={styles.bottomControlsOverlay}>
          {/* Mode Selector Tabs (Scan Food, Barcode, Food Label) */}
          <View style={styles.modeTabsRow}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.modeTab,
                scanMode === 'food' && styles.modeTabActive,
              ]}
              onPress={() => {
                triggerSelection();
                chooseMode('food');
              }}
            >
              <Scan
                size={13}
                color={scanMode === 'food' ? PALETTE[950] : PALETTE[300]}
              />
              <Text
                style={[
                  styles.modeTabText,
                  scanMode === 'food' && styles.modeTabTextActive,
                ]}
              >
                Scan Food
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.modeTab,
                scanMode === 'barcode' && styles.modeTabActive,
              ]}
              onPress={() => {
                triggerSelection();
                chooseMode('barcode');
              }}
            >
              <QrCode
                size={13}
                color={scanMode === 'barcode' ? PALETTE[950] : PALETTE[300]}
              />
              <Text
                style={[
                  styles.modeTabText,
                  scanMode === 'barcode' && styles.modeTabTextActive,
                ]}
              >
                Barcode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.modeTab,
                scanMode === 'label' && styles.modeTabActive,
              ]}
              onPress={() => {
                triggerSelection();
                chooseMode('label');
              }}
            >
              <Tag
                size={13}
                color={scanMode === 'label' ? PALETTE[950] : PALETTE[300]}
              />
              <Text
                style={[
                  styles.modeTabText,
                  scanMode === 'label' && styles.modeTabTextActive,
                ]}
              >
                Food Label
              </Text>
            </TouchableOpacity>
          </View>

          {/* Shutter Button Row */}
          <View style={styles.shutterRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'}
              disabled={isScanning}
              style={[
                styles.shutterSideBtn,
                torch && styles.shutterSideBtnActive,
              ]}
              onPress={() => {
                triggerLightImpact();
                setTorch(!torch);
              }}
            >
              <Zap size={20} color={torch ? PALETTE[950] : PALETTE[50]} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Take meal photo"
              style={styles.shutterOuter}
              onPress={handleCapture}
              disabled={scanMode === 'barcode' || isScanning || (permission?.granted && !cameraReady)}
              activeOpacity={0.85}
            >
              <View style={styles.shutterInner}>
                {isScanning && (
                  <ActivityIndicator size="small" color={PALETTE[950]} />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Choose meal photo for AI analysis"
              disabled={isScanning || resultModalVisible}
              style={styles.shutterSideBtn}
              onPress={() => {
                triggerLightImpact();
                handlePickGallery();
              }}
            >
              <ImageIcon size={20} color={PALETTE[50]} />
            </TouchableOpacity>
          </View>
        </View>
        {(isScanning || scanError) && (
          <View style={styles.analysisOverlay}>
            {selectedImage ? <Image source={{ uri: selectedImage }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            <ScrollView contentContainerStyle={styles.statusBody}>
              <View style={styles.statusCard}>
                {isScanning ? (
                  <>
                    <ActivityIndicator size="large" color={JOURNAL.accent} accessibilityLabel="Analyzing meal photo" />
                    <Text accessibilityRole="header" style={styles.statusTitle}>
                      {phase === 'capture' ? 'Getting your photo…' : phase === 'preparing' ? 'Preparing your photo…' : phase === 'lookup' ? 'Looking up this barcode…' : 'Estimating your meal…'}
                    </Text>
                    <Text accessibilityLiveRegion="polite" style={styles.statusText}>
                      {phase === 'lookup' ? 'Checking product nutrition.' : 'Your portion, calories, protein, carbs and fat will appear in Add Meal for review.'}
                    </Text>
                    <TouchableOpacity accessibilityRole="button" style={styles.statusButton} onPress={cancelAnalysis}>
                      <Text style={styles.statusButtonText}>Cancel analysis</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text accessibilityRole="header" style={styles.statusTitle}>{needsSignIn ? 'Sign in for AI photos' : 'Photo needs another look'}</Text>
                    <Text accessibilityRole="alert" style={styles.statusText}>{scanError}</Text>
                    {needsSignIn ? (
                      <TouchableOpacity accessibilityRole="button" style={styles.statusButton} onPress={() => setAuthVisible(true)}>
                        <Text style={styles.statusButtonText}>Sign in</Text>
                      </TouchableOpacity>
                    ) : canRetry ? (
                      <TouchableOpacity accessibilityRole="button" style={styles.statusButton} onPress={() => void processPhoto(async () => lastPhoto.current, true)}>
                        <Text style={styles.statusButtonText}>Try analysis again</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity accessibilityRole="button" style={styles.statusButton} onPress={resetPhoto}>
                      <Text style={styles.statusButtonText}>Retake or choose another photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" style={styles.statusButton} onPress={enterManually}>
                      <Text style={styles.statusButtonText}>Enter nutrition manually</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
      </ScrollView>
      <AuthModal visible={isFocused && authVisible} onClose={() => setAuthVisible(false)} />
      {/* Result & Breakdown Modal */}
      <MealResultModal
        visible={isFocused && resultModalVisible}
        onClose={() => {
          setResultModalVisible(false);
          setScanResult(null);
          resetPhoto();
        }}
        result={scanResult}
        nutritionSource={resultSource}
        title={resultSource === 'photo' || resultSource === 'manual' ? 'Add a meal' : undefined}
        defaultMealType={mealType}
        sourceLabel={
          resultSource === 'barcode'
            ? 'Barcode values · review the portion'
            : resultSource === 'label'
              ? 'Label reading · review the recognized values'
              : resultSource === 'manual'
                ? selectedImage ? 'Enter the values manually. The photo is attached for reference.' : 'Enter the values manually.'
                : 'Filled from your photo · estimated nutrition for the pictured portion. Check the portion and hidden ingredients before saving.'
        }
        imageUri={selectedImage}
        onConfirm={async (item) => {
          if (!focused.current || draftOwner.current !== accountOwner) throw new Error('Your account or screen changed. Please scan the meal again.');
          await logMeal({
            name: item.name,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            mealType: item.mealType,
            portionSize: item.portionSize,
            imageUri: item.imageUri,
            isAiGenerated: resultSource === 'photo' || resultSource === 'label',
            date: getTodayDateString(),
            source: resultSource,
            ingredients: item.ingredients,
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

  },
  scannerBody: { flexGrow: 1 },
  guidance: { fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20, color: PALETTE[200], paddingHorizontal: 20, marginBottom: 12 },
  analysisOverlay: { ...StyleSheet.absoluteFill, backgroundColor: JOURNAL.ink },
  statusBody: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  statusCard: { padding: 20, borderRadius: 20, backgroundColor: JOURNAL.paper, gap: 12 },
  statusTitle: { fontFamily: FONTS.bold, fontSize: 20, lineHeight: 28, color: JOURNAL.ink },
  statusText: { fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22, color: JOURNAL.muted },
  statusButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: JOURNAL.selected, borderRadius: 12 },
  statusButtonText: { fontFamily: FONTS.semibold, fontSize: 14, lineHeight: 22, color: JOURNAL.accentText, textAlign: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  topBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(218, 237, 235, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fitnessBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  topTitle: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE[50],
  },
  viewfinderContainer: {
    flex: 1,
    minHeight: 460,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'ios' ? 18 : 12,
  },
  permissionFallback: {
    ...StyleSheet.absoluteFill,
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
    fontSize: 12,
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
    backgroundColor: JOURNAL.scrim,
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  zoomPill: {
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 10,
  },
  zoomPillActive: {
    backgroundColor: PALETTE.white,
  },
  zoomText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
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
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 12,
  },
  modeTabActive: {
    backgroundColor: PALETTE.white,
  },
  modeTabText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
  reticleOverlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 110,
  },
  barcodeFrame: {
    width: 250,
    height: 140,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelFrame: {
    width: 260,
    height: 320,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: PALETTE[500],
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 8,
  },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: PALETTE[500],
    shadowColor: PALETTE[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  reticleInstructionText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE[50],
    backgroundColor: 'rgba(16, 33, 35, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 16,
    overflow: 'hidden',
  },
});
