const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
const { overlayCloudRecords } = load('src/services/cloudRecords.ts');
const { PhotoUrlCache } = load('src/services/photoUrlCache.ts');
const { SyncScheduler } = load('src/services/syncScheduler.ts');
test('indexed cloud overlay replaces by ID/date, respects tombstones and sorts once', () => {
 const snapshot={entries:[{id:'a',timestamp:'2026-01-01'},{id:'b',timestamp:'2026-01-02'}],weights:[{id:'old',date:'2026-01-01'}]};
 const records=[{entity:'food',record_key:'a',deleted:true,version:2},{entity:'food',record_key:'b',payload:{id:'b',name:'updated',timestamp:'2026-01-03'},version:3},{entity:'weight',record_key:'2026-01-01',payload:{id:'new',date:'2026-01-01'},version:2}];
 const result=overlayCloudRecords(snapshot,records);assert.equal(result.snapshot.entries.length,1);assert.equal(result.snapshot.entries[0].name,'updated');assert.equal(result.snapshot.weights.length,1);assert.equal(result.snapshot.weights[0].id,'new');assert.equal(result.versions['food:a'],2);
});
test('private links batch, deduplicate, reuse, expire, and isolate accounts',async()=>{
 let now=1000,calls=[];const cache=new PhotoUrlCache(()=>now);const sign=async paths=>{calls.push(paths);return paths.map(path=>({path,url:`https://private/${path}/${now}`}));};
 const paths=Array.from({length:150},(_,i)=>`alice/${i}`);await cache.resolve('alice',[...paths,paths[0]],sign);assert.equal(calls.length,2);await cache.resolve('alice',paths,sign);assert.equal(calls.length,2);
 now+=86400000;await cache.resolve('alice',paths,sign);assert.equal(calls.length,4);
 await cache.resolve('bob',['bob/photo'],sign);await cache.resolve('alice',[paths[0]],sign);assert.equal(calls.length,6);await assert.rejects(cache.resolve('bob',[paths[0]],sign),/another account/);
});
test('failed signing can retry and missing objects never cache invalid links',async()=>{
 const cache=new PhotoUrlCache();await assert.rejects(cache.resolve('alice',['alice/photo'],async()=>[{path:'alice/photo',error:'missing'}]));const urls=await cache.resolve('alice',['alice/photo'],async()=>[{path:'alice/photo',url:'https://ok'}]);assert.equal(urls.get('alice/photo'),'https://ok');
});
test('scheduler debounces edits, suspends background requests, polls empty outboxes and backs off',async()=>{
 let now=0,id=0,calls=0;const timers=new Map();const scheduler=new SyncScheduler(()=>now,(fn,delay)=>{timers.set(++id,{fn,delay});return id;},id=>timers.delete(id));
 const run=async()=>{calls++;};const flush=async()=>{const tasks=[...timers.values()];timers.clear();for(const task of tasks)task.fn();await new Promise(setImmediate);};
 scheduler.completed('alice');scheduler.request('alice',true,false,run);assert.equal(timers.size,0);
 scheduler.request('alice',true,true,run);scheduler.request('alice',true,true,run);assert.equal(timers.size,1);assert.equal([...timers.values()][0].delay,1500);
 scheduler.request('alice',false,false,run);assert.equal(timers.size,0);scheduler.request('alice',true,false,run);await flush();assert.equal(calls,1);
 now=300001;scheduler.request('alice',true,false,run);await flush();assert.equal(calls,2);
 scheduler.request('alice',true,true,async()=>{calls++;throw Error('offline');});await flush();scheduler.request('alice',true,true,run);assert.equal(timers.size,0);now+=30001;scheduler.request('alice',true,false,run);await flush();assert.equal(calls,4);
 scheduler.request('guest',true,true,run);assert.equal(timers.size,0);
});
const { fetchCloudDelta } = load('src/services/cloudDelta.ts');
const row=(key,revision,deleted=false)=>({entity:'food',record_key:key,payload:deleted?null:{id:key,timestamp:'2026-01-01'},deleted,version:1,sync_revision:revision});
test('delta pagination holds a fixed boundary and includes tombstones',async()=>{
 const calls=[];const result=await fetchCloudDelta('0',async(after,until)=>{calls.push({after,until});return {error:null,data:after==='0'?{until:'3',records:[row('one',1)],next:'1'}:{until:'3',records:[row('deleted',3,true)],next:null}};});assert.equal(result.cursor,'3');assert.equal(result.records.length,2);assert.equal(result.records[1].deleted,true);assert.deepEqual(calls,[{after:'0',until:null},{after:'1',until:'3'}]);
});
test('invalid or failed continuation rejects the entire pull without advancing a cursor',async()=>{
 await assert.rejects(fetchCloudDelta('1',async()=>({data:{until:'3',records:[row('one',2)],next:'1'},error:null})),/invalid continuation/);
 let count=0;await assert.rejects(fetchCloudDelta('0',async()=>++count===1?{error:null,data:{until:'2',records:[row('one',1)],next:'1'}}:{data:null,error:{message:'offline'}}),/offline/);
 await assert.rejects(fetchCloudDelta('0',async()=>({error:null,data:{until:'1',records:[row('bad',2)],next:null}})),/invalid record/);
});
