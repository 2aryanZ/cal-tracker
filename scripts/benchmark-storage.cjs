// Controlled JavaScript/storage work. Not a native disk or phone frame-rate profile.
const { performance } = require('node:perf_hooks');
const { load, memoryStorage } = require('../tests/helpers.cjs');
async function run(size) {
  const disk = memoryStorage();
  const storage = load('src/services/storage.ts', {'@react-native-async-storage/async-storage':disk});
  await storage.setStorageScope('benchmark');
  const entries = Array.from({length:size},(_,i)=>({id:`meal-${i}`,name:'Rice with vegetables',mealType:'lunch',date:'2026-10-10',timestamp:'2026-10-10T12:00:00Z',calories:400,protein:12,carbs:70,fats:8,portionSize:'1 bowl',isAiGenerated:false}));
  await storage.applyCloudSnapshot('benchmark',{entries},Object.fromEntries(entries.map(entry=>[`food:${entry.id}`,1])),String(size));
  const before = await storage.getSnapshot();
  let reads=0,writes=0,bytes=0;const get=disk.getItem,set=disk.setItem;
  disk.getItem=async(...args)=>{reads++;return get(...args);};
  disk.setItem=async(key,value)=>{writes++;bytes=Buffer.byteLength(value);return set(key,value);};
  const samples=[];
  for(let i=0;i<9;i++) {
    const start=performance.now();await storage.incrementWaterForDate('2026-10-10',250);await storage.getSnapshot();samples.push(performance.now()-start);
  }
  const after=await storage.getSnapshot();
  samples.sort((a,b)=>a-b);
  return {meals:size,waterSaveMedianMs:Number(samples[4].toFixed(3)),warmDiskReads:reads,writes,bytesPerWrite:bytes,mealArrayRetained:before.entries===after.entries};
}
(async()=>{for(const size of [1000,5000,10000])console.log(JSON.stringify(await run(size)));})().catch(error=>{console.error(error);process.exitCode=1;});
