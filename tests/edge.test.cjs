const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { load } = require('./helpers.cjs');
const validation = load('supabase/functions/nutrition-analysis/validation.ts');
const targets = {calories:2000,protein:100,carbs:200,fats:60};
const meal = {foodName:'Rice',servingSize:'100g',calories:0,protein:0,carbs:0,fats:0,confidence:.5};
function endpoint(output=meal, raw=false) {
  let handler; const calls=[];
  const code=ts.transpileModule(fs.readFileSync('supabase/functions/nutrition-analysis/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const context={exports:{},require:()=>validation,Response,Request,AbortController,RangeError,setTimeout,clearTimeout,Deno:{env:{get:()=> 'configured'},serve:fn=>{handler=fn;}},fetch:async(url,options)=>{calls.push({url,options});if(url.includes('/auth/'))return Response.json({id:'owner'});if(url.includes('/rpc/'))return Response.json(1);return Response.json({candidates:[{content:{parts:[{text:raw ? output : JSON.stringify(output)}]}}]});}};
  vm.runInNewContext(code,context);
  return {handler,calls};
}
const request=body=>new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify(body)});
test('analysis endpoint rejects invalid bodies before reserving quota',async()=>{
  for(const body of [null,[],{kind:'text',transcript:''},{kind:'plan',targets:{...targets,protein:-1},preference:'balanced'},{kind:'text',transcript:'rice',base64:'abcd'}]){
    const {handler,calls}=endpoint();assert.equal((await handler(request(body))).status,400);assert.equal(calls.length,1);
  }
});
test('analysis endpoint accepts valid zero nutrition but rejects malformed model output',async()=>{
  for(const output of [[],{foodName:'Rice'}, {...meal,calories:-1}, {...meal,breakdown:{}}, {...meal,confidence:2}]){
    const {handler}=endpoint(output);assert.equal((await handler(request({kind:'text',transcript:'rice'}))).status,502);
  }
  const {handler}=endpoint();const result=await handler(request({kind:'text',transcript:'rice'}));assert.equal(result.status,200);assert.deepEqual(await result.json(),meal);
});
test('analysis endpoint requires authorization and enforces declared body limit',async()=>{
  const {handler,calls}=endpoint();assert.equal((await handler(new Request('https://example.test',{method:'POST'}))).status,401);assert.equal(calls.length,0);
  const req=request({kind:'text',transcript:'rice'});req.headers.set('content-length','8000001');assert.equal((await handler(req)).status,413);
});
test('request validation rejects partial and incompatible plan targets',()=>{
  assert.equal(validation.validRequest({kind:'plan',targets,preference:'vegan'}),true);
  assert.equal(validation.validRequest({kind:'plan',targets:{calories:2000},preference:'vegan'}),false);
  assert.equal(validation.validRequest({kind:'plan',targets:{...targets,protein:2000},preference:'vegan'}),false);
});

test('malformed provider JSON is an upstream failure, not a user input error',async()=>{
 const {handler}=endpoint('not json',true);assert.equal((await handler(request({kind:'text',transcript:'rice'}))).status,502);
});
test('streamed body limit is enforced even without a content-length header',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(2000000));},cancel(){cancelled=true;}});
 const req=new Request('https://example.test',{method:'POST',body:stream,duplex:'half'});
 await assert.rejects(validation.readRequest(req,new AbortController().signal),/smaller photo/);assert.equal(cancelled,true);
});
test('aborted request cannot wait indefinitely for streamed input',async()=>{
 const controller=new AbortController();let cancelled=false;
 const req=new Request('https://example.test',{method:'POST',duplex:'half',body:new ReadableStream({cancel(){cancelled=true;}})});
 const reading=validation.readRequest(req,controller.signal);controller.abort();await assert.rejects(reading,/timed out/);assert.equal(cancelled,true);
});
