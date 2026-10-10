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
test('delta pulls preserve untouched history and pending edits while applying deletions atomically',async()=>{
 const {api}=subject();await api.setStorageScope('alice');await api.applyCloudSnapshot('alice',{entries:[meal('untouched'),meal('deleted'),meal('edited')]},{'food:edited':1},'3');await api.updateFoodEntry({...meal('edited'),calories:200});
 await api.applyCloudDelta('alice',[{entity:'food',record_key:'deleted',deleted:true,payload:null,version:2},{entity:'food',record_key:'edited',deleted:false,payload:{...meal('edited'),calories:300},version:2},{entity:'food',record_key:'new',deleted:false,payload:meal('new'),version:1}],'6');
 const s=await api.getSnapshot();assert.equal(s.entries.length,3);assert.equal(s.entries.find(e=>e.id==='edited').calories,200);assert.ok(s.entries.some(e=>e.id==='untouched'));assert.equal(s.syncCursor,'6');assert.equal(s.outbox[0].expectedVersion,1);
});
test('failed delta commit retains both old cursor and records; unchanged polls do not write',async()=>{
 const {api,disk}=subject();await api.setStorageScope('alice');await api.applyCloudSnapshot('alice',{entries:[meal('original')]},{},'1');const set=disk.setItem;disk.setItem=async()=>{throw Error('disk full');};await assert.rejects(api.applyCloudDelta('alice',[{entity:'food',record_key:'original',deleted:true,payload:null,version:2}],'2'),/disk full/);disk.setItem=set;assert.equal((await api.getSnapshot()).syncCursor,'1');assert.equal((await api.getFoodEntries()).length,1);
 let writes=0;disk.setItem=async(...args)=>{writes++;return set(...args);};await api.applyCloudDelta('alice',[],'1');assert.equal(writes,0);await api.setStorageScope('bob');await api.applyCloudDelta('alice',[],'5');assert.equal((await api.getSnapshot()).syncCursor,undefined);
});
test('photo renewal changes only matching private paths without enqueueing another upload',async()=>{
 const {api}=subject();await api.setStorageScope('alice');await api.applyCloudSnapshot('alice',{entries:[{...meal('photo'),imagePath:'alice/current',imageUri:'https://expired'}]},{},'1');await api.refreshResolvedPhotos('alice',[{id:'photo',path:'alice/old',url:'https://stale'}]);assert.equal((await api.getFoodEntries())[0].imageUri,'https://expired');await api.refreshResolvedPhotos('alice',[{id:'photo',path:'alice/current',url:'https://renewed'}]);assert.equal((await api.getFoodEntries())[0].imageUri,'https://renewed');assert.equal((await api.getPendingChanges()).length,0);assert.equal((await api.getSnapshot()).syncCursor,'1');
});
test('warm reads and water-only saves preserve journal identity with no disk rereads',async()=>{
 const {api,disk}=subject();await api.setStorageScope('alice');await api.saveFoodEntry(meal());const before=await api.getSnapshot();let reads=0;const get=disk.getItem;disk.getItem=async(...args)=>{reads++;return get(...args);};await api.incrementWaterForDate('2026-09-29',250);const after=await api.getSnapshot();assert.equal(reads,0);assert.equal(after.entries,before.entries);assert.equal(after.weights,before.weights);assert.equal(before.waterLogs['2026-09-29'],undefined);assert.equal(after.waterLogs['2026-09-29'],250);assert.equal(await api.getSnapshot(),after);assert.ok(Object.isFrozen(after));assert.ok(Object.isFrozen(after.entries[0]));
});
test('failed mutable-field commits cannot alter a cached snapshot or its queued payload',async()=>{
 const {api,disk}=subject();await api.setStorageScope('alice');await api.incrementWaterForDate('2026-09-29',250);const before=await api.getSnapshot();disk.setItem=async()=>{throw Error('disk full');};await assert.rejects(api.incrementWaterForDate('2026-09-29',250),/disk full/);assert.equal(await api.getSnapshot(),before);assert.equal(before.waterLogs['2026-09-29'],250);assert.equal(before.outbox[0].payload.waterMl,250);
 const pending=before.outbox[0];await assert.rejects(api.acknowledgeChange('alice',pending.id,pending.entity,pending.key,1),/disk full/);assert.equal((await api.getPendingChanges())[0].id,pending.id);assert.equal((await api.getSnapshot()).versions['water:2026-09-29'],undefined);
});
test('cloud water deltas preserve meal and weight references; duplicate badges and celebrations do not write',async()=>{
 const {api,disk}=subject();await api.setStorageScope('alice');await api.applyCloudSnapshot('alice',{entries:[meal()]},{},'1');const before=await api.getSnapshot();await api.applyCloudDelta('alice',[{entity:'water',record_key:'2026-09-29',payload:{waterMl:250},deleted:false,version:1}],'2');const after=await api.getSnapshot();assert.equal(after.entries,before.entries);assert.equal(after.weights,before.weights);assert.equal(after.waterLogs['2026-09-29'],250);
 await api.markCelebrated('2026-09-29');let writes=0;const set=disk.setItem;disk.setItem=async(...args)=>{writes++;return set(...args);};assert.equal(await api.markCelebrated('2026-09-29'),false);await api.recordBadges([]);assert.equal(writes,0);
});
