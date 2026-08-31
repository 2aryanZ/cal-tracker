import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Flame,
  Plus,
  Minus,
  ArrowLeft,
  Drumstick,
  Wheat,
  Droplet,
  Camera,
  Trash2,
  Check,
  Search,
  Sparkles,
} from 'lucide-react-native';
import { AiFoodDetectionResult, MealType, FoodEntry } from '@/types/nutrition';
import {
  COMPREHENSIVE_FOOD_DATABASE,
  FoodDatabaseItem,
  searchFoodDatabase,
} from '@/services/aiFoodService';
import { PALETTE, FONTS } from '@/constants/theme';

interface IngredientItem {
  id: string;
  name: string;
  portion: string;
  calories: number;
}

interface MealResultModalProps {
  visible: boolean;
  onClose: () => void;
  result?: AiFoodDetectionResult | null;
  editingEntry?: FoodEntry | null;
  defaultMealType?: MealType;
  imageUri?: string;
  onConfirm: (item: {
    id?: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    mealType: MealType;
    portionSize: string;
    imageUri?: string;
  }) => void;
  onDeleteEntry?: (id: string) => void;
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=350&q=75&auto=format&fit=crop';

export function MealResultModal({
  visible,
  onClose,
  result,
  editingEntry,
  defaultMealType = 'lunch',
  imageUri,
  onConfirm,
  onDeleteEntry,
}: MealResultModalProps) {
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('450');
  const [protein, setProtein] = useState('30');
  const [carbs, setCarbs] = useState('45');
  const [fats, setFats] = useState('15');
  const [portion, setPortion] = useState('1 serving');
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [multiplier, setMultiplier] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<string>(DEFAULT_IMAGE);
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  // Ref to track modal open/close transitions so user edits are NEVER clobbered on re-render
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      // Modal just opened! Populate initial state ONCE.
      if (editingEntry) {
        setFoodName(editingEntry.name || '');
        setCalories(String(editingEntry.calories || 0));
        setProtein(String(editingEntry.protein || 0));
        setCarbs(String(editingEntry.carbs || 0));
        setFats(String(editingEntry.fats || 0));
        setPortion(editingEntry.portionSize || '1 serving');
        setMealType(editingEntry.mealType || 'lunch');
        setSelectedPhoto(editingEntry.imageUri || DEFAULT_IMAGE);
        setMultiplier(1);
        setIngredients([
          {
            id: '1',
            name: editingEntry.name || 'Main Portion',
            portion: editingEntry.portionSize || '1 serving',
            calories: editingEntry.calories || 0,
          },
        ]);
      } else if (result) {
        setFoodName(result.foodName || 'Detected Meal');
        setCalories(String(Math.round(result.calories || 450)));
        setProtein(String(Math.round(result.protein || 30)));
        setCarbs(String(Math.round(result.carbs || 45)));
        setFats(String(Math.round(result.fats || 15)));
        setPortion(result.servingSize || '1 serving');
        setSelectedPhoto(imageUri || DEFAULT_IMAGE);
        setMultiplier(1);
        setMealType(defaultMealType || 'lunch');

        if (result.breakdown && result.breakdown.length > 0) {
          setIngredients(
            result.breakdown.map((b, i) => ({
              id: `ing_${i}_${Date.now()}`,
              name: b.item,
              portion: b.portion,
              calories: b.calories,
            }))
          );
        } else {
          setIngredients([
            {
              id: '1',
              name: result.foodName || 'Main Portion',
              portion: result.servingSize || '1 serving',
              calories: result.calories || 450,
            },
          ]);
        }
      } else {
        setFoodName('Grilled Chicken Caesar Salad');
        setCalories('520');
        setProtein('46');
        setCarbs('18');
        setFats('28');
        setPortion('1 bowl (350g)');
        setMealType(defaultMealType || 'lunch');
        setSelectedPhoto(imageUri || DEFAULT_IMAGE);
        setMultiplier(1);
        setIngredients([
          { id: '1', name: 'Grilled Chicken Breast', portion: '180g', calories: 290 },
          { id: '2', name: 'Mixed Greens & Cucumber', portion: '100g', calories: 30 },
          { id: '3', name: 'Olive Oil & Caesar Dressing', portion: '30ml', calories: 140 },
          { id: '4', name: 'Parmesan & Croutons', portion: '40g', calories: 60 },
        ]);
      }
    }
    wasVisibleRef.current = visible;
  }, [visible, editingEntry, result, defaultMealType, imageUri]);

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Access Required',
          'Please allow photo library access in your device settings to select food images.'
        );
        return;
      }

      const pick = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!pick.canceled && pick.assets?.[0]) {
        setSelectedPhoto(pick.assets[0].uri);
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  const handleSelectFoodPreset = (item: FoodDatabaseItem) => {
    setFoodName(item.name);
    setCalories(String(item.calories));
    setProtein(String(item.protein));
    setCarbs(String(item.carbs));
    setFats(String(item.fats));
    setPortion(item.servingSize);
    setSelectedPhoto(item.imageUri);
    setMealType(item.category);
    setMultiplier(1);
    setIngredients(
      item.breakdown.map((b, i) => ({
        id: `ing_${i}_${Date.now()}`,
        name: b.item,
        portion: b.portion,
        calories: b.calories,
      }))
    );
  };

  const handleMultiplierChange = (newMultiplier: number) => {
    if (newMultiplier <= 0) return;
    const ratio = newMultiplier / multiplier;
    setMultiplier(newMultiplier);
    setCalories(String(Math.round((Number(calories) || 0) * ratio)));
    setProtein(String(Math.round((Number(protein) || 0) * ratio)));
    setCarbs(String(Math.round((Number(carbs) || 0) * ratio)));
    setFats(String(Math.round((Number(fats) || 0) * ratio)));
  };

  // Add new ingredient row
  const handleAddIngredient = () => {
    const newIng: IngredientItem = {
      id: `ing_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: 'New Ingredient',
      portion: '100g',
      calories: 80,
    };
    const updated = [...ingredients, newIng];
    setIngredients(updated);
    const totalCal = updated.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
    setCalories(String(totalCal));
  };

  // Update ingredient field
  const handleUpdateIngredient = (id: string, field: 'name' | 'portion' | 'calories', val: string) => {
    const updated = ingredients.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          [field]: field === 'calories' ? Number(val) || 0 : val,
        };
      }
      return item;
    });
    setIngredients(updated);
    if (field === 'calories') {
      const totalCal = updated.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
      setCalories(String(totalCal));
    }
  };

  // Delete ingredient row
  const handleDeleteIngredient = (id: string) => {
    const updated = ingredients.filter((item) => item.id !== id);
    setIngredients(updated);
    const totalCal = updated.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
    setCalories(String(totalCal));
  };

  const handleSave = () => {
    onConfirm({
      id: editingEntry?.id,
      name: foodName.trim() || 'Logged Meal',
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fats: Number(fats) || 0,
      mealType,
      portionSize: portion,
      imageUri: selectedPhoto,
    });
    onClose();
  };

  const handleDeleteEntry = () => {
    if (editingEntry?.id && onDeleteEntry) {
      onDeleteEntry(editingEntry.id);
      onClose();
    }
  };

  const filteredPresets = searchFoodDatabase(searchFilter);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        {/* Top Header Controls */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.topIconBtn}>
            <ArrowLeft size={18} color={PALETTE[50]} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Meal Details</Text>
          <TouchableOpacity
            style={styles.changePhotoHeaderBtn}
            onPress={handlePickPhoto}
            activeOpacity={0.85}>
            <Camera size={14} color={PALETTE[50]} />
            <Text style={styles.changePhotoHeaderText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Top Image Preview with Tap-to-Change Overlay */}
        <TouchableOpacity
          style={styles.imageWrapper}
          onPress={handlePickPhoto}
          activeOpacity={0.9}>
          <Image
            source={{ uri: selectedPhoto }}
            style={styles.topImage}
            cachePolicy="memory-disk"
            transition={150}
          />
          <View style={styles.changePhotoBadge}>
            <Camera size={12} color={PALETTE[50]} />
            <Text style={styles.changePhotoBadgeText}>Tap to Change Photo</Text>
          </View>
        </TouchableOpacity>

        {/* Bottom Nutrition Sheet */}
        <View style={styles.sheetContainer}>
          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Quick 1-Tap Food Match Search Carousel */}
            <View style={styles.databaseMatchSection}>
              <View style={styles.dbHeaderRow}>
                <Sparkles size={13} color={PALETTE[700]} />
                <Text style={styles.dbSectionTitle}>AI FOOD SEARCH & MATCH (1-TAP AUTOFILL):</Text>
              </View>

              <View style={styles.searchBarBox}>
                <Search size={14} color={PALETTE[400]} />
                <TextInput
                  value={searchFilter}
                  onChangeText={setSearchFilter}
                  placeholder="Search 40+ foods (e.g. Biryani, Salmon, Pizza, Oats...)"
                  placeholderTextColor={PALETTE[400]}
                  style={styles.searchBarInput}
                />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsList}>
                {filteredPresets.map((item) => {
                  const isSelected = foodName === item.name;
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[styles.foodChipBtn, isSelected && styles.foodChipBtnActive]}
                      onPress={() => handleSelectFoodPreset(item)}
                      activeOpacity={0.8}>
                      <Image
                        source={{ uri: item.imageUri }}
                        style={styles.foodChipThumb}
                        cachePolicy="memory-disk"
                        transition={100}
                      />
                      <View>
                        <Text
                          style={[styles.foodChipText, isSelected && styles.foodChipTextActive]}
                          numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.foodChipSub}>
                          {item.calories} kcal • {item.protein}g P
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Meal Type Category Selector */}
            <View style={styles.mealTypeRow}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.mealTypePill, mealType === t && styles.mealTypePillActive]}
                  onPress={() => setMealType(t)}
                  activeOpacity={0.7}>
                  <Text style={[styles.mealTypeText, mealType === t && styles.mealTypeTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title & Serving Multiplier */}
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeTag}>
                  {editingEntry?.timestamp
                    ? new Date(editingEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Today • Ready to Log'}
                </Text>
                <TextInput
                  value={foodName}
                  onChangeText={setFoodName}
                  style={styles.foodNameInput}
                  placeholder="Dish Name"
                  placeholderTextColor={PALETTE[400]}
                />
              </View>

              {/* Stepper */}
              <View style={styles.stepperBox}>
                <TouchableOpacity
                  onPress={() => handleMultiplierChange(Math.max(0.5, multiplier - 0.5))}
                  style={styles.stepBtn}>
                  <Minus size={13} color={PALETTE[950]} />
                </TouchableOpacity>
                <Text style={styles.stepperVal}>{multiplier}x</Text>
                <TouchableOpacity
                  onPress={() => handleMultiplierChange(multiplier + 0.5)}
                  style={styles.stepBtn}>
                  <Plus size={13} color={PALETTE[950]} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Calorie Hero Card */}
            <View style={styles.calorieHeroCard}>
              <View style={styles.calIconBox}>
                <Flame size={18} color={PALETTE[950]} fill={PALETTE[950]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.calLabel}>Total Calories</Text>
                <View style={styles.calInputRow}>
                  <TextInput
                    value={calories}
                    onChangeText={setCalories}
                    keyboardType="numeric"
                    style={styles.calInput}
                  />
                  <Text style={styles.calUnitText}>kcal</Text>
                </View>
              </View>
            </View>

            {/* Quick Calorie Adjustment Chips */}
            <View style={styles.quickCalPillsRow}>
              <TouchableOpacity
                style={styles.quickCalPill}
                onPress={() => setCalories(String(Math.max(0, (Number(calories) || 0) - 50)))}>
                <Text style={styles.quickCalPillText}>-50</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickCalPill}
                onPress={() => setCalories(String((Number(calories) || 0) + 50))}>
                <Text style={styles.quickCalPillText}>+50</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickCalPill}
                onPress={() => setCalories(String((Number(calories) || 0) + 100))}>
                <Text style={styles.quickCalPillText}>+100</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickCalPill}
                onPress={() => setCalories(String((Number(calories) || 0) + 200))}>
                <Text style={styles.quickCalPillText}>+200</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickCalPill, styles.quickCalPillAuto]}
                onPress={() => {
                  const cals = Number(calories) || 450;
                  setProtein(String(Math.round((cals * 0.3) / 4)));
                  setCarbs(String(Math.round((cals * 0.45) / 4)));
                  setFats(String(Math.round((cals * 0.25) / 9)));
                }}>
                <Text style={styles.quickCalPillAutoText}>✨ Auto Macros</Text>
              </TouchableOpacity>
            </View>

            {/* 3 Macro Columns - 100% Fully Editable */}
            <View style={styles.macroColumnsRow}>
              <View style={styles.macroCol}>
                <View style={styles.macroHeaderPill}>
                  <Drumstick size={12} color={PALETTE[700]} />
                  <Text style={styles.macroColLabel}>Protein</Text>
                </View>
                <View style={styles.macroInputRow}>
                  <TextInput
                    value={protein}
                    onChangeText={setProtein}
                    keyboardType="numeric"
                    selectTextOnFocus
                    style={styles.macroColInput}
                  />
                  <Text style={styles.macroUnitText}>g</Text>
                </View>
              </View>

              <View style={styles.macroCol}>
                <View style={styles.macroHeaderPill}>
                  <Wheat size={12} color={PALETTE[500]} />
                  <Text style={styles.macroColLabel}>Carbs</Text>
                </View>
                <View style={styles.macroInputRow}>
                  <TextInput
                    value={carbs}
                    onChangeText={setCarbs}
                    keyboardType="numeric"
                    selectTextOnFocus
                    style={styles.macroColInput}
                  />
                  <Text style={styles.macroUnitText}>g</Text>
                </View>
              </View>

              <View style={styles.macroCol}>
                <View style={styles.macroHeaderPill}>
                  <Droplet size={12} color={PALETTE[400]} />
                  <Text style={styles.macroColLabel}>Fats</Text>
                </View>
                <View style={styles.macroInputRow}>
                  <TextInput
                    value={fats}
                    onChangeText={setFats}
                    keyboardType="numeric"
                    selectTextOnFocus
                    style={styles.macroColInput}
                  />
                  <Text style={styles.macroUnitText}>g</Text>
                </View>
              </View>
            </View>

            {/* Ingredients Section with Full Editing & Adding */}
            <View style={styles.ingredientsHeader}>
              <View>
                <Text style={styles.ingredientsTitle}>Ingredients Breakdown</Text>
                <Text style={styles.ingredientsSub}>Tap items to edit name, portion, or calories</Text>
              </View>
              <TouchableOpacity style={styles.addIngBtn} onPress={handleAddIngredient} activeOpacity={0.8}>
                <Plus size={13} color={PALETTE[50]} />
                <Text style={styles.addIngBtnText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.ingredientsList}>
              {ingredients.map((ing) => (
                <View key={ing.id} style={styles.ingredientRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <TextInput
                      value={ing.name}
                      onChangeText={(val) => handleUpdateIngredient(ing.id, 'name', val)}
                      style={styles.ingNameInput}
                      placeholder="Ingredient name"
                      placeholderTextColor={PALETTE[400]}
                    />
                    <TextInput
                      value={ing.portion}
                      onChangeText={(val) => handleUpdateIngredient(ing.id, 'portion', val)}
                      style={styles.ingPortionInput}
                      placeholder="Portion (e.g. 100g)"
                      placeholderTextColor={PALETTE[400]}
                    />
                  </View>

                  <View style={styles.ingCalBox}>
                    <TextInput
                      value={String(ing.calories)}
                      onChangeText={(val) => handleUpdateIngredient(ing.id, 'calories', val)}
                      keyboardType="numeric"
                      style={styles.ingCalInput}
                    />
                    <Text style={styles.ingCalUnit}>cal</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.ingDeleteBtn}
                    onPress={() => handleDeleteIngredient(ing.id)}>
                    <Trash2 size={13} color={PALETTE[400]} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Portion Text Input */}
            <View style={styles.portionRow}>
              <Text style={styles.portionLabel}>Portion Size Description</Text>
              <TextInput
                value={portion}
                onChangeText={setPortion}
                style={styles.portionInput}
                placeholder="e.g. 1 standard bowl / 350g"
                placeholderTextColor={PALETTE[400]}
              />
            </View>

            {/* Action Buttons: Log / Save & Delete */}
            <View style={styles.bottomButtonsRow}>
              {editingEntry?.id && onDeleteEntry ? (
                <TouchableOpacity
                  style={styles.deleteMealBtn}
                  onPress={handleDeleteEntry}
                  activeOpacity={0.85}>
                  <Trash2 size={16} color="#DC2626" />
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={styles.confirmBtn} onPress={handleSave} activeOpacity={0.85}>
                <Check size={18} color={PALETTE[50]} />
                <Text style={styles.confirmBtnText}>
                  {editingEntry?.id ? 'Save Changes' : 'Log This Meal'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: PALETTE[950],
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 36 : 48,
    paddingBottom: 12,
    zIndex: 10,
  },
  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(218, 237, 235, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: FONTS.serif,
    fontSize: 17,
    fontWeight: '700',
    color: PALETTE[50],
  },
  changePhotoHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(218, 237, 235, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  changePhotoHeaderText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[50],
  },
  imageWrapper: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  topImage: {
    width: '100%',
    height: '100%',
  },
  changePhotoBadge: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    backgroundColor: 'rgba(16, 33, 35, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  changePhotoBadgeText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[50],
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: PALETTE.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    overflow: 'hidden',
  },
  scrollBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  databaseMatchSection: {
    marginBottom: 14,
    backgroundColor: PALETTE[50],
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  dbHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dbSectionTitle: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    fontWeight: '800',
    color: PALETTE[700],
    letterSpacing: 0.8,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PALETTE.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: PALETTE[200],
    marginBottom: 8,
  },
  searchBarInput: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[950],
    padding: 0,
  },
  presetsList: {
    flexDirection: 'row',
    gap: 8,
  },
  foodChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: PALETTE.white,
    borderWidth: 1,
    borderColor: PALETTE[200],
  },
  foodChipBtnActive: {
    borderColor: PALETTE[950],
    backgroundColor: PALETTE[100],
  },
  foodChipThumb: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  foodChipText: {
    fontFamily: FONTS.serif,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[950],
    maxWidth: 150,
  },
  foodChipTextActive: {
    color: PALETTE[950],
  },
  foodChipSub: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    color: PALETTE[600],
    fontWeight: '600',
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  mealTypePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: PALETTE[50],
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  mealTypePillActive: {
    backgroundColor: PALETTE[950],
    borderColor: PALETTE[950],
  },
  mealTypeText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[600],
  },
  mealTypeTextActive: {
    color: PALETTE[50],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeTag: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[400],
    fontWeight: '600',
  },
  foodNameInput: {
    fontFamily: FONTS.serif,
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE[950],
    padding: 0,
    marginTop: 2,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE[100],
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PALETTE[100],
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 8,
  },
  stepBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
  },
  calorieHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: PALETTE[50],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
    marginBottom: 8,
  },
  quickCalPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  quickCalPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: PALETTE[50],
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  quickCalPillText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[700],
  },
  quickCalPillAuto: {
    marginLeft: 'auto',
    backgroundColor: PALETTE[100],
    borderColor: PALETTE[200],
  },
  quickCalPillAutoText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[950],
  },
  calIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: PALETTE[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  calLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[600],
  },
  calInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  calInput: {
    fontFamily: FONTS.serif,
    fontSize: 24,
    fontWeight: '700',
    color: PALETTE[950],
    padding: 0,
  },
  calUnitText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE[400],
  },
  macroColumnsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  macroCol: {
    flex: 1,
    backgroundColor: PALETTE[50],
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  macroHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  macroColLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[600],
  },
  macroInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  macroColInput: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE[950],
    padding: 0,
    textAlign: 'center',
    minWidth: 32,
  },
  macroUnitText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[400],
    fontWeight: '600',
  },
  ingredientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ingredientsTitle: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[950],
  },
  ingredientsSub: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[400],
  },
  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE[950],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addIngBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[50],
  },
  ingredientsList: {
    gap: 8,
    marginBottom: 14,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PALETTE[50],
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  ingNameInput: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
    padding: 0,
  },
  ingPortionInput: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[600],
    padding: 0,
  },
  ingCalBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    backgroundColor: PALETTE.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  ingCalInput: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE[950],
    padding: 0,
    textAlign: 'right',
  },
  ingCalUnit: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    color: PALETTE[400],
  },
  ingDeleteBtn: {
    padding: 4,
  },
  portionRow: {
    marginBottom: 16,
  },
  portionLabel: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[800],
    marginBottom: 4,
  },
  portionInput: {
    backgroundColor: PALETTE[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[950],
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteMealBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: PALETTE[950],
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE[50],
  },
});
