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
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, Plus, Trash2, Heart } from 'lucide-react-native';
import type {
  AiFoodDetectionResult,
  MealType,
  FoodEntry,
} from '@/types/nutrition';
import { searchFoodDatabase } from '@/services/aiFoodService';
import { validateMeal, assertNumber } from '@/services/nutritionRules';
import { persistMealPhoto } from '@/services/photoStorage';
import { useNutrition } from '@/context/NutritionContext';
import { JOURNAL, FONTS } from '@/constants/theme';
interface MealData {
  id?: string;
  name: string;
  foodName?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portionSize: string;
  mealType: MealType;
  imageUri?: string;
  source?: FoodEntry['source'];
  isAiGenerated?: boolean;
  ingredients?: { item: string; portion: string; calories: number }[];
}
interface Props {
  visible: boolean;
  onClose: () => void;
  result?: AiFoodDetectionResult | null;
  editingEntry?: FoodEntry | null;
  defaultMealType?: MealType;
  imageUri?: string;
  sourceLabel?: string;
  nutritionSource?: FoodEntry['source'];
  onConfirm: (data: MealData) => void | Promise<void>;
  onDeleteEntry?: (id: string) => void | Promise<void>;
}
type IngredientDraft = { item: string; portion: string; calories: string };
function MealForm({
  onClose,
  result,
  editingEntry,
  defaultMealType = 'lunch',
  imageUri,
  sourceLabel,
  nutritionSource,
  onConfirm,
  onDeleteEntry,
}: Omit<Props, 'visible'>) {
  const { toggleFavoriteMeal, isFavoriteMeal } = useNutrition();
  const initial =
    editingEntry ??
    (result
      ? { name: result.foodName, ...result, portionSize: result.servingSize }
      : null);
  const [name, setName] = useState(initial?.name ?? '');
  const [nutrition, setNutrition] = useState({
    calories: String(initial?.calories ?? ''),
    protein: String(initial?.protein ?? ''),
    carbs: String(initial?.carbs ?? ''),
    fats: String(initial?.fats ?? ''),
  });
  const [portion, setPortion] = useState(initial?.portionSize ?? '1 serving'),
    [type, setType] = useState<MealType>(
      editingEntry?.mealType ?? defaultMealType,
    );
  const [photo, setPhoto] = useState(editingEntry?.imageUri ?? imageUri ?? '');
  const [notes, setNotes] = useState<IngredientDraft[]>(
    (editingEntry?.ingredients ?? result?.breakdown ?? []).map((i) => ({
      ...i,
      calories: String(i.calories),
    })),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const build = (): MealData => {
    if (Object.values(nutrition).some((value) => !value.trim()))
      throw new Error('Enter all nutrition values. Zero is allowed.');
    if (notes.some((note) => !note.item.trim() || !note.calories.trim()))
      throw new Error(
        'Enter an ingredient name and calorie value, or remove the empty note.',
      );
    const source = editingEntry?.source ?? nutritionSource ?? 'manual';
    const data = {
      id: editingEntry?.id,
      name: name.trim(),
      source,
      isAiGenerated:
        editingEntry?.isAiGenerated ??
        (source === 'photo' || source === 'label' || source === 'text'),
      ...Object.fromEntries(
        Object.entries(nutrition).map(([k, v]) => [k, Number(v)]),
      ),
      mealType: type,
      portionSize: portion.trim(),
      imageUri: photo || undefined,
      ingredients: notes.map((i) => ({ ...i, calories: Number(i.calories) })),
    } as MealData;
    validateMeal(data);
    data.ingredients?.forEach((i) => {
      if (!i.calories && i.calories !== 0)
        throw new Error('Enter an ingredient calorie value.');
      assertNumber(i.calories, 'Ingredient calories', 0, 10000);
    });
    return data;
  };
  const run = async (action: () => Promise<void>) => {
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
  const save = () =>
    run(async () => {
      const data = build();
      data.imageUri = await persistMealPhoto(data.imageUri);
      await onConfirm(data);
      onClose();
    });
  const pick = () =>
    run(async () => {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        throw new Error('Allow photo library access to attach a meal photo.');
      const selected = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!selected.canceled && selected.assets[0])
        setPhoto(selected.assets[0].uri);
    });
  const changeNote = (
    index: number,
    field: keyof IngredientDraft,
    value: string,
  ) =>
    setNotes((all) =>
      all.map((note, i) => (i === index ? { ...note, [field]: value } : note)),
    );
  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.body}
        >
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {editingEntry
                ? 'Edit meal'
                : result
                  ? 'Review meal'
                  : 'Add a meal'}
            </Text>
            <TouchableOpacity
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Close meal details"
              onPress={onClose}
              style={styles.iconButton}
            >
              <X size={22} color={JOURNAL.ink} />
            </TouchableOpacity>
          </View>
          <Text style={styles.caption}>
            {sourceLabel ||
              (editingEntry?.source === 'barcode'
                ? 'Barcode values'
                : editingEntry?.isAiGenerated || result
                  ? 'Review the nutrition values before saving. Estimates may need adjusting.'
                  : 'Enter nutrition from a food label or your own measurements.')}
          </Text>
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          {!editingEntry && !result && (
            <View style={styles.examples}>
              <Text style={styles.label}>
                Optional food examples · estimates
              </Text>
              <TextInput
                accessibilityLabel="Search example foods"
                style={styles.input}
                placeholder="Search example foods"
                placeholderTextColor={JOURNAL.muted}
                value={search}
                onChangeText={setSearch}
              />
              {search.trim()
                ? searchFoodDatabase(search).map((item) => (
                    <TouchableOpacity
                      accessibilityRole="button"
                      key={item.name}
                      style={styles.example}
                      onPress={() => {
                        setName(item.name);
                        setNutrition({
                          calories: String(item.calories),
                          protein: String(item.protein),
                          carbs: String(item.carbs),
                          fats: String(item.fats),
                        });
                        setPortion(item.servingSize);
                        setType(item.category);
                        setNotes(
                          item.breakdown.map((i) => ({
                            ...i,
                            calories: String(i.calories),
                          })),
                        );
                        setSearch('');
                      }}
                    >
                      <Text style={styles.text}>
                        {item.name} · {item.calories} kcal
                      </Text>
                    </TouchableOpacity>
                  ))
                : null}
            </View>
          )}
          <Text style={styles.label}>Meal name</Text>
          <TextInput
            accessibilityLabel="Meal name"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="What did you eat?"
            placeholderTextColor={JOURNAL.muted}
          />
          <Text style={styles.label}>Meal</Text>
          <View style={styles.slots}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(
              (slot) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: type === slot }}
                  key={slot}
                  style={[styles.slot, type === slot && styles.selected]}
                  onPress={() => setType(slot)}
                >
                  <Text style={styles.slotText}>
                    {slot[0].toUpperCase() + slot.slice(1)}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
          <Text style={styles.label}>Portion</Text>
          <TextInput
            accessibilityLabel="Portion size"
            style={styles.input}
            value={portion}
            onChangeText={setPortion}
          />
          <Text style={styles.caption}>
            Nutrition values below apply to this whole portion. Editing the
            portion description does not change them.
          </Text>
          <View style={styles.nutrition}>
            {(
              [
                { key: 'calories', label: 'Calories (kcal)' },
                { key: 'protein', label: 'Protein (g)' },
                { key: 'carbs', label: 'Carbs (g)' },
                { key: 'fats', label: 'Fat (g)' },
              ] as const
            ).map(({ key, label }) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  accessibilityLabel={label}
                  keyboardType="decimal-pad"
                  value={nutrition[key]}
                  onChangeText={(value) =>
                    setNutrition((all) => ({ ...all, [key]: value }))
                  }
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={JOURNAL.muted}
                />
              </View>
            ))}
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void pick()}
            style={styles.photoButton}
          >
            {photo ? (
              <Image
                source={{ uri: photo }}
                style={styles.photo}
                accessibilityLabel="Attached meal photo"
                cachePolicy="memory-disk"
              />
            ) : (
              <Camera size={22} color={JOURNAL.accent} />
            )}
            <Text style={styles.text}>
              {photo ? 'Change meal photo' : 'Add a photo (optional)'}
            </Text>
          </TouchableOpacity>
          <View style={styles.notesHeader}>
            <Text style={styles.section}>Ingredient notes</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Add ingredient note"
              style={styles.iconButton}
              onPress={() =>
                setNotes((all) => [
                  ...all,
                  { item: '', portion: '', calories: '0' },
                ])
              }
            >
              <Plus size={20} color={JOURNAL.accent} />
            </TouchableOpacity>
          </View>
          <Text style={styles.caption}>
            Notes are separate from your meal’s total nutrition.
          </Text>
          {notes.map((note, index) => (
            <View key={index} style={styles.note}>
              <TextInput
                accessibilityLabel={`Ingredient ${index + 1} name`}
                placeholder="Ingredient"
                value={note.item}
                onChangeText={(v) => changeNote(index, 'item', v)}
                style={styles.input}
              />
              <View style={styles.noteRow}>
                <TextInput
                  accessibilityLabel={`Ingredient ${index + 1} portion`}
                  placeholder="Portion"
                  value={note.portion}
                  onChangeText={(v) => changeNote(index, 'portion', v)}
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  accessibilityLabel={`Ingredient ${index + 1} calories`}
                  keyboardType="decimal-pad"
                  value={note.calories}
                  onChangeText={(v) => changeNote(index, 'calories', v)}
                  style={[styles.input, { width: 80 }]}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ingredient ${index + 1}`}
                  onPress={() =>
                    setNotes((all) => all.filter((_, i) => i !== index))
                  }
                  style={styles.iconButton}
                >
                  <Trash2 size={18} color={JOURNAL.muted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                const data = build();
                data.imageUri = await persistMealPhoto(data.imageUri);
                await toggleFavoriteMeal(data);
              })
            }
            style={styles.favorite}
          >
            <Heart size={18} color={JOURNAL.accent} />
            <Text style={styles.text}>
              {isFavoriteMeal(name)
                ? 'Remove from favorites'
                : 'Save to favorites'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void save()}
            style={[styles.primary, busy && styles.disabled]}
          >
            {busy ? (
              <ActivityIndicator
                color={JOURNAL.surface}
                accessibilityLabel="Saving meal"
              />
            ) : (
              <Text style={styles.primaryText}>
                {editingEntry ? 'Save changes' : 'Save meal'}
              </Text>
            )}
          </TouchableOpacity>
          {editingEntry && onDeleteEntry ? (
            <View>
              {confirmDelete ? (
                <View style={styles.deletion}>
                  <Text style={styles.text}>
                    Delete this meal from your journal?
                  </Text>
                  <View style={styles.slots}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={busy}
                      style={styles.slot}
                      onPress={() => setConfirmDelete(false)}
                    >
                      <Text style={styles.text}>Keep meal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={busy}
                      style={styles.slot}
                      onPress={() =>
                        void run(async () => {
                          await onDeleteEntry(editingEntry.id);
                          onClose();
                        })
                      }
                    >
                      <Text style={styles.error}>Delete meal</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy}
                  style={styles.favorite}
                  onPress={() => setConfirmDelete(true)}
                >
                  <Trash2 size={18} color={JOURNAL.error} />
                  <Text style={styles.error}>Delete meal</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function MealResultModal(props: Props) {
  if (!props.visible) return null;
  return (
    <Modal visible animationType="none" onRequestClose={props.onClose}>
      <MealForm {...props} />
    </Modal>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: JOURNAL.paper },
  body: {
    padding: 24,
    paddingBottom: 40,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: { fontFamily: FONTS.serif, fontSize: 30, color: JOURNAL.ink, flex: 1 },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { fontSize: 14, lineHeight: 22, color: JOURNAL.muted },
  label: { fontSize: 14, color: JOURNAL.muted, marginBottom: 8, marginTop: 20 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: JOURNAL.line,
    backgroundColor: JOURNAL.surface,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: JOURNAL.ink,
  },
  text: { fontSize: 16, color: JOURNAL.ink, lineHeight: 24 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    padding: 12,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: JOURNAL.surface,
    borderWidth: 1,
    borderColor: JOURNAL.line,
    justifyContent: 'center',
  },
  selected: { backgroundColor: JOURNAL.soft, borderColor: JOURNAL.accent },
  slotText: { fontSize: 14, color: JOURNAL.ink },
  nutrition: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  field: { width: '47%' },
  photoButton: {
    marginTop: 24,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: JOURNAL.line,
    padding: 12,
    borderRadius: 12,
  },
  photo: { width: 64, height: 64, borderRadius: 8 },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  section: { fontFamily: FONTS.serif, fontSize: 20, color: JOURNAL.ink },
  note: {
    marginTop: 16,
    padding: 12,
    backgroundColor: JOURNAL.soft,
    borderRadius: 12,
    gap: 8,
  },
  noteRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  favorite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 20,
  },
  primary: {
    minHeight: 52,
    backgroundColor: JOURNAL.accent,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryText: { fontSize: 16, fontWeight: '600', color: JOURNAL.surface },
  disabled: { opacity: 0.6 },
  error: { color: JOURNAL.error, fontSize: 14, lineHeight: 22, marginTop: 12 },
  deletion: { marginTop: 24 },
  examples: { marginBottom: 8 },
  example: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: JOURNAL.line,
  },
});
