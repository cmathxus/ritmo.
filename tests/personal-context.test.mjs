import test from 'node:test';
import assert from 'node:assert/strict';
import {contextDates,loadPersonalContext} from '../supabase/functions/analyze-meal/personal-context.ts';
import {createHandler} from '../supabase/functions/analyze-meal/index.ts';
const response=(value,status=200)=>new Response(JSON.stringify(value),{status});
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'private',GEMINI_API_KEY:'gemini'};
test('personal context uses local calendar dates across midnight',()=>{
 assert.deepEqual(contextDates('America/Sao_Paulo',new Date('2026-10-27T01:00:00Z')),{today:'2026-10-26',from:'2026-10-20',timeZone:'America/Sao_Paulo'});
 assert.equal(contextDates('Asia/Tokyo',new Date('2026-10-27T01:00:00Z')).today,'2026-10-27');
});
test('context queries are scoped to verified owner with user JWT, bounded, no emails',async()=>{
 const calls=[];const data=await loadPersonalContext({url:env.SUPABASE_URL,anon:'public',auth:'Bearer session',userId:'owner',timeZone:'America/Sao_Paulo',fetcher:async(url,init)=>{calls.push({url:new URL(url),init});return response(url.includes('/profiles?')?[{name:'Ana',base_calories:2300}]:url.includes('/metabolic_profiles?')?[{goal:'maintenance',goal_selected:false,weight:70}]:url.includes('/meals?')?Array.from({length:121},()=>({name:'x'.repeat(200),description:'y'.repeat(500),date:'2026-10-26',calories:300})):[]);}});
 assert.equal(calls.length,4);for(const c of calls){assert.equal(c.init.headers.Authorization,'Bearer session');assert.equal(c.init.headers.apikey,'public');assert.equal(c.url.searchParams.get(c.url.pathname.endsWith('/profiles')?'id':'user_id'),'eq.owner');assert(!c.url.searchParams.get('select').includes('email'));}
 assert.equal(data.meals.length,120);assert.equal(data.meals[0].food.length,120);assert.equal(data.meals[0].notes.length,250);assert.equal(data.truncated,true);assert.equal(data.metabolism.goal,null);
});
function handlerSetup({contextFailure=false}={}){
 const calls=[];const handler=createHandler({getEnv:name=>env[name],fetcher:async(url,init)=>{calls.push({url,init});if(url.endsWith('/auth/v1/user'))return response({id:'verified-owner'});if(url.includes('/rest/v1/rpc/'))return response({allowed:true,remaining:49});if(url.includes('/rest/v1/'))return response(url.includes('/profiles?')?[{name:'Ana',base_calories:2300}]:[],contextFailure?500:200);return response({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({is_food_question:true,answer:'Seu diário pode estar incompleto.',calories_min:null,calories_max:null,portion:''})}]}}]});}});
 return {handler,calls};
}
const request=body=>new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer session','Content-Type':'application/json'},body:JSON.stringify({mode:'question',question:'Me explica meu dia?',request_id:'00000000-0000-4000-8000-000000000001',...body})});
test('personalization ignores client-supplied identity and facts; opt-out never fetches diary',async()=>{
 const s=handlerSetup();const r=await s.handler(request({personalize:true,user_id:'friend',personal_context:{name:'forged'},time_zone:'America/Sao_Paulo'}));assert.equal(r.status,200);assert.equal((await r.json()).personalized,true);
 const rest=s.calls.filter(c=>c.url.includes('/rest/v1/')&&!c.url.includes('/rpc/'));assert.equal(rest.length,4);assert(rest.every(c=>new URL(c.url).search.includes('eq.verified-owner')));const provider=s.calls.find(c=>c.url.includes('generativelanguage'));const prompt=JSON.parse(provider.init.body).systemInstruction.parts[0].text;assert(prompt.includes('Ana'));assert(!prompt.includes('forged'));assert(prompt.includes('não some duas vezes'));
 const off=handlerSetup();const result=await off.handler(request({personalize:false}));assert.equal(result.status,200);assert.equal(off.calls.length,3);assert.equal((await result.json()).personalized,false);
});
test('context failure does not invent facts, consume quota or call Gemini',async()=>{
 const s=handlerSetup({contextFailure:true});const r=await s.handler(request({personalize:true}));assert.equal(r.status,503);assert.equal((await r.json()).error,'CONTEXT_UNAVAILABLE');assert(!s.calls.some(c=>c.url.includes('/rpc/')||c.url.includes('generativelanguage')));
 for(const body of [{personalize:'true'},{personalize:true,time_zone:'Invalid/Zone'}]){const x=handlerSetup();assert.equal((await x.handler(request(body))).status,400);assert.equal(x.calls.length,1);}
});
