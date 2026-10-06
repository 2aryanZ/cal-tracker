import type { UserProfile } from './tdeeCalculator';
import { cmToFtIn, ftInToCm, kgToLbs, lbsToKg } from './tdeeCalculator';
import { validateProfile } from './nutritionRules';

export interface ProfileDraft {
  unit: UserProfile['unitSystem'];
  gender: UserProfile['gender'] | '';
  goal: UserProfile['goal'] | '';
  activity: UserProfile['activityLevel'] | '';
  age: string;
  height: string;
  feet: string;
  inches: string;
  weight: string;
  target: string;
  steps: string;
}
export type DraftErrors = Partial<Record<keyof ProfileDraft, string>>;
export function profileDraft(profile: UserProfile, firstSetup: boolean): ProfileDraft {
  const imperial = profile.unitSystem === 'imperial';
  const h = cmToFtIn(profile.heightCm);
  return {
    unit: profile.unitSystem,
    gender: firstSetup ? '' : profile.gender,
    goal: firstSetup ? '' : profile.goal,
    activity: firstSetup ? '' : profile.activityLevel,
    age: firstSetup ? '' : String(profile.age),
    height: firstSetup ? '' : String(profile.heightCm),
    feet: firstSetup ? '' : String(h.feet),
    inches: firstSetup ? '' : String(h.inches),
    weight: firstSetup ? '' : String(imperial ? kgToLbs(profile.weightKg) : profile.weightKg),
    target: firstSetup ? '' : String(imperial ? kgToLbs(profile.targetWeightKg) : profile.targetWeightKg),
    steps: firstSetup ? '' : String(profile.dailySteps),
  };
}
const numeric = (text: string) => /^\d+(?:[.,]\d+)?$/.test(text.trim());
const number = (text: string) => Number(text.trim().replace(',', '.'));
export function convertDraftUnits(draft: ProfileDraft, unit: ProfileDraft['unit']): ProfileDraft {
  if (unit === draft.unit) return draft;
  const convert = (text: string) => numeric(text)
    ? String(unit === 'imperial' ? kgToLbs(number(text)) : lbsToKg(number(text))) : text;
  const next = { ...draft, unit, weight: convert(draft.weight), target: convert(draft.target) };
  if (unit === 'imperial') {
    const h = numeric(draft.height) ? cmToFtIn(number(draft.height)) : null;
    next.feet = h ? String(h.feet) : '';
    next.inches = h ? String(h.inches) : '';
  } else {
    next.height = numeric(draft.feet) && numeric(draft.inches)
      ? String(ftInToCm(number(draft.feet), number(draft.inches))) : '';
  }
  return next;
}
export function draftErrors(draft: ProfileDraft, step: 0 | 1): DraftErrors {
  const errors: DraftErrors = {};
  const check = (key: keyof ProfileDraft, label: string, min: number, max: number, integer = false) => {
    const value = number(draft[key]);
    if (!draft[key].trim()) errors[key] = `Enter ${label.toLowerCase()}.`;
    else if (!numeric(draft[key]) || value < min || value > max || (integer && !Number.isInteger(value)))
      errors[key] = `${label} must be ${integer ? 'a whole number ' : ''}between ${min} and ${max}.`;
  };
  if (step === 0) {
    check('age', 'Age', 18, 120, true);
    if (!draft.gender) errors.gender = 'Choose a sex for the calorie calculation.';
    if (draft.unit === 'metric') check('height', 'Height in cm', 100, 250);
    else {
      check('feet', 'Height in feet', 3, 8, true);
      check('inches', 'Height in inches', 0, 11);
      if (!errors.feet && !errors.inches) {
        const cm = ftInToCm(number(draft.feet), number(draft.inches));
        if (cm < 100 || cm > 250) errors.feet = 'Height must be between 100 and 250 cm (about 3 ft 3 in–8 ft 2 in).';
      }
    }
    check('weight', `Weight in ${draft.unit === 'metric' ? 'kg' : 'lbs'}`, draft.unit === 'metric' ? 30 : 66.2, draft.unit === 'metric' ? 400 : 881.8);
  } else {
    if (!draft.goal) errors.goal = 'Choose your goal.';
    if (!draft.activity) errors.activity = 'Choose your usual activity level.';
    check('target', `Target weight in ${draft.unit === 'metric' ? 'kg' : 'lbs'}`, draft.unit === 'metric' ? 30 : 66.2, draft.unit === 'metric' ? 400 : 881.8);
    check('steps', 'Daily steps', 0, 100000, true);
    if (!errors.target && numeric(draft.weight)) {
      if (draft.goal === 'fat_loss' && number(draft.target) >= number(draft.weight)) errors.target = 'Choose a target below your current weight.';
      if (draft.goal === 'muscle_gain' && number(draft.target) <= number(draft.weight)) errors.target = 'Choose a target above your current weight.';
    }
  }
  return errors;
}
export function reviewedProfile(draft: ProfileDraft): UserProfile {
  const errors = { ...draftErrors(draft, 0), ...draftErrors(draft, 1) };
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const profile: UserProfile = {
    age: number(draft.age), gender: draft.gender as UserProfile['gender'],
    goal: draft.goal as UserProfile['goal'], activityLevel: draft.activity as UserProfile['activityLevel'],
    unitSystem: draft.unit, dailySteps: number(draft.steps),
    heightCm: draft.unit === 'metric' ? number(draft.height) : ftInToCm(number(draft.feet), number(draft.inches)),
    weightKg: draft.unit === 'metric' ? number(draft.weight) : lbsToKg(number(draft.weight)),
    targetWeightKg: draft.unit === 'metric' ? number(draft.target) : lbsToKg(number(draft.target)),
  };
  validateProfile(profile);
  return profile;
}
