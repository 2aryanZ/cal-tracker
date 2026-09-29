const test = require('node:test');
const assert = require('node:assert/strict');
const { load, memoryStorage } = require('./helpers.cjs');
const meal = (id='meal-1',date='2026-09-29') => ({id,name:'Real meal',date,timestamp:date+'T12:00:00Z',calories:100,protein:0,carbs:25,fats:0,mealType:'lunch'});
function subject(initial={}) { const disk=memoryStorage(initial); const api=load('src/services/storage.ts',{'@react-native-async-storage/async-storage':disk});return {disk,api}; }
test('fresh installation contains no fictional meals, water, weights, favorites or streak',async()=>{
 const {api}=subject();await api.initializeStorage();assert.equal((await api.getFoodEntries()).length,0);assert.equal(await api.getWaterForDate(api.getTodayDateString()),0);assert.equal((await api.getWeightLogs()).length,0);assert.equal((await api.getFavoriteMeals()).length,0);assert.equal((await api.getUserStats()).currentStreak,0);
});
test('concurrent cold-start meal saves retain every meal and count',async()=>{
 const {api}=subject();await Promise.all(Array.from({length:20},(_,i)=>api.saveFoodEntry(meal('meal-'+i))));assert.equal((await api.getFoodEntries()).length,20);assert.equal((await api.getUserStats()).totalMealsLogged,20);
});
test('concurrent water increments retain every amount',async()=>{
 const {api}=subject();await Promise.all(Array.from({length:10},()=>api.incrementWaterForDate('2026-09-29',100)));assert.equal(await api.getWaterForDate('2026-09-29'),1000);
});
test('legitimate 2025 weight records survive migration and repeated reads',async()=>{
 const record={id:'old-weight',date:'2025-01-02',weightKg:80,weightLbs:176,timestamp:'2025-01-02T12:00:00Z'};
 const {api,disk}=subject({'@cal_ai_weight_logs_v1':JSON.stringify([record])});assert.equal((await api.getWeightLogs())[0].id,'old-weight');assert.equal((await api.getWeightLogs())[0].date,'2025-01-02');assert.ok(disk.data.has('@cal_ai_weight_logs_v1'));
});
test('guest and two accounts have isolated data and pending changes',async()=>{
 const {api}=subject();await api.saveFoodEntry(meal('guest-meal'));await api.setStorageScope('alice');assert.equal((await api.getFoodEntries()).length,0);await api.saveFoodEntry(meal('alice-meal'));await api.setStorageScope('bob');assert.equal((await api.getFoodEntries()).length,0);assert.equal((await api.getPendingChanges()).length,0);await api.setStorageScope(null);assert.equal((await api.getFoodEntries())[0].id,'guest-meal');assert.equal((await api.getPendingChanges()).length,0);await api.setStorageScope('alice');assert.equal((await api.getPendingChanges())[0].key,'alice-meal');
});
test('failed disk write rejects and retains previous committed data',async()=>{
 const {api,disk}=subject();await api.initializeStorage();const original=disk.setItem;disk.setItem=async()=>{throw Error('disk full');};await assert.rejects(api.saveFoodEntry(meal()),/disk full/);disk.setItem=original;assert.equal((await api.getFoodEntries()).length,0);
});
test('zero macros persist; negatives and nonfinite inputs are rejected',async()=>{
 const {api}=subject();await api.saveFoodEntry(meal());assert.equal((await api.getFoodEntries())[0].protein,0);await assert.rejects(api.saveFoodEntry({...meal('bad'),calories:-1}));await assert.rejects(api.saveWaterForDate('2026-02-30',100));await assert.rejects(api.saveMacroGoals({calories:2200,protein:NaN,carbs:220,fats:65}));
});
test('same-date weigh-in updates stable ID and queue key; backdates are sorted',async()=>{
 const {api}=subject();await api.setStorageScope('alice');await api.addWeightLog({date:'2026-09-29',weightKg:75,weightLbs:999});const first=(await api.getWeightLogs())[0];await api.addWeightLog({date:'2026-09-29',weightKg:76,weightLbs:999});await api.addWeightLog({date:'2025-01-02',weightKg:80,weightLbs:999});const list=await api.getWeightLogs();assert.equal(list[0].id,first.id);assert.equal(list[0].weightKg,76);assert.equal(list[0].weightLbs,167.6);assert.equal(list.length,2);assert.equal((await api.getPendingChanges()).filter(c=>c.key==='2026-09-29').length,1);
});
test('pending deletes are durable and cloud refresh cannot resurrect them',async()=>{
 const {api}=subject();await api.setStorageScope('alice');await api.saveFoodEntry(meal());await api.deleteFoodEntry('meal-1');await api.applyCloudSnapshot('alice',{entries:[meal()],weights:[],waterLogs:{}},{'food:meal-1':1});assert.equal((await api.getFoodEntries()).length,0);assert.equal((await api.getPendingChanges())[0].action,'delete');assert.equal((await api.getPendingChanges())[0].expectedVersion,0);
});
test('an edit during upload stays pending with the acknowledged version',async()=>{
 const {api}=subject();await api.setStorageScope('alice');await api.saveFoodEntry(meal());const sent=(await api.getPendingChanges())[0];await api.updateFoodEntry({...meal(),calories:200});await api.acknowledgeChange('alice',sent.id,sent.entity,sent.key,1);const pending=(await api.getPendingChanges())[0];assert.equal(pending.payload.calories,200);assert.equal(pending.expectedVersion,1);
});
test('history stats recompute after deletion; backdated meals cannot invent a today streak',async()=>{
 const {api}=subject();await api.saveFoodEntriesBatch([meal('old','2025-01-01'),meal('old2','2025-01-02')]);let stats=await api.getUserStats();assert.equal(stats.currentStreak,0);assert.equal(stats.bestStreak,2);await api.deleteFoodEntry('old');stats=await api.getUserStats();assert.equal(stats.bestStreak,1);assert.equal(stats.totalMealsLogged,1);
});
test('backdated weights and deletions update profile from the actual newest date atomically',async()=>{const {api}=subject();await api.saveWeightAndProfile({date:'2026-09-29',weightKg:75});await api.saveWeightAndProfile({date:'2025-01-02',weightKg:85});assert.equal((await api.getUserProfile()).weightKg,75);const latest=(await api.getWeightLogs())[0];await api.deleteWeightAndUpdateProfile(latest.id);assert.equal((await api.getUserProfile()).weightKg,85);});
test('invalid targets cannot partially commit a profile change',async()=>{const {api}=subject();await api.initializeStorage();const original=await api.getUserProfile();await assert.rejects(api.saveProfileAndTargets({...original,weightKg:90},{calories:-1,protein:1,carbs:1,fats:1}));assert.equal((await api.getUserProfile()).weightKg,original.weightKg);assert.equal((await api.getWeightLogs()).length,0);});
test('cloud hydration restores weight, notes, units, steps, water targets and preferences',async()=>{const {api}=subject();await api.setStorageScope('alice');const profile={...(await api.getUserProfile()),unitSystem:'imperial',dailySteps:12345};await api.applyCloudSnapshot('alice',{entries:[],weights:[{id:'remote',date:'2025-01-01',weightKg:70,weightLbs:154.3,timestamp:'2025-01-01T12:00:00Z',note:'Remote note'}],waterLogs:{'2025-01-01':0},profile,goals:{calories:2000,protein:0,carbs:300,fats:50,waterMl:3500},preference:'vegan',favorites:[{name:'Real favorite'}]},{'weight:2025-01-01':3});assert.equal((await api.getWeightLogs())[0].note,'Remote note');assert.equal((await api.getUserProfile()).unitSystem,'imperial');assert.equal((await api.getUserProfile()).dailySteps,12345);assert.equal((await api.getMacroGoals()).protein,0);assert.equal((await api.getMacroGoals()).waterMl,3500);assert.equal(await api.getDietaryPreference(),'vegan');assert.equal((await api.getFavoriteMeals())[0].name,'Real favorite');});

test('optional water target is normalized before local save and cloud queue',async()=>{
 const {api}=subject();await api.setStorageScope('alice');await api.saveMacroGoals({calories:2000,protein:100,carbs:200,fats:60});assert.equal((await api.getMacroGoals()).waterMl,2000);assert.equal((await api.getPendingChanges()).find(c=>c.entity==='goals').payload.waterMl,2000);
});
test('saved favorites retain estimate provenance and ingredient notes across reads',async()=>{
 const {api}=subject();
 await api.saveFavoriteMeal({name:'Photo meal',calories:100,protein:0,carbs:25,fats:0,mealType:'lunch',source:'photo',isAiGenerated:true,ingredients:[{item:'Rice',portion:'1 bowl',calories:100}]});
 const favorite=(await api.getFavoriteMeals())[0];
 assert.equal(favorite.source,'photo');assert.equal(favorite.isAiGenerated,true);assert.equal(favorite.ingredients[0].item,'Rice');
});
