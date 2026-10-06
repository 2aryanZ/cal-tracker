const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
const rules = load('src/services/onboardingRules.ts');
const profile = { gender: 'male', age: 26, heightCm: 178, weightKg: 78, targetWeightKg: 74, dailySteps: 8500, activityLevel: 'moderate', goal: 'fat_loss', unitSystem: 'metric' };

test('first setup has no invented personal measurements or selected calculation options', () => {
  const draft = rules.profileDraft(profile, true);
  for (const key of ['age', 'height', 'feet', 'inches', 'weight', 'target', 'steps', 'gender', 'goal', 'activity']) assert.equal(draft[key], '');
  assert.ok(Object.keys(rules.draftErrors(draft, 0)).length);
  assert.throws(() => rules.reviewedProfile(draft));
});
test('editing a saved profile preserves its details and does not mutate it', () => {
  const before = JSON.stringify(profile);
  const draft = rules.profileDraft(profile, false);
  const reviewed = rules.reviewedProfile(draft);
  for (const key of Object.keys(profile)) assert.equal(reviewed[key], profile[key]);
  assert.equal(JSON.stringify(profile), before);
});
test('unit switches leave blanks blank and retain zero inches and steps', () => {
  const empty = rules.convertDraftUnits(rules.profileDraft(profile, true), 'imperial');
  for (const key of ['weight', 'target', 'feet', 'inches']) assert.equal(empty[key], '');
  assert.equal(rules.convertDraftUnits(empty, 'metric').height, '');
  const draft = { ...rules.profileDraft(profile, false), feet: '6', inches: '0', steps: '0', unit: 'imperial', weight: '172', target: '163' };
  assert.equal(rules.convertDraftUnits(draft, 'metric').height, '183');
  assert.equal(rules.reviewedProfile(draft).dailySteps, 0);
});
test('body validation rejects invalid, fractional ages and incomplete imperial height', () => {
  const draft = rules.profileDraft(profile, false);
  for (const age of ['17', '121', '26.5', '1e2', 'no']) assert.ok(rules.draftErrors({ ...draft, age }, 0).age);
  assert.ok(rules.draftErrors({ ...draft, unit: 'imperial', feet: '6', inches: '' }, 0).inches);
  assert.ok(rules.draftErrors({ ...draft, unit: 'imperial', feet: '6', inches: '12' }, 0).inches);
});
test('goal validation catches incompatible targets without rejecting valid maintenance', () => {
  const draft = rules.profileDraft(profile, false);
  assert.ok(rules.draftErrors({ ...draft, target: '80' }, 1).target);
  assert.ok(rules.draftErrors({ ...draft, goal: 'muscle_gain', target: '70' }, 1).target);
  assert.equal(Object.keys(rules.draftErrors({ ...draft, goal: 'maintenance', target: '78' }, 1)).length, 0);
  assert.throws(() => rules.reviewedProfile({ ...draft, activity: 'unknown' }));
});
test('decimal comma inputs are parsed consistently across review and unit conversion', () => {
  const draft = { ...rules.profileDraft(profile, false), weight: '78,5' };
  assert.equal(rules.reviewedProfile(draft).weightKg, 78.5);
  assert.equal(rules.convertDraftUnits(draft, 'imperial').weight, '173.1');
});
