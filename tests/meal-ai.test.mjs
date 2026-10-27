import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,validateEstimate,validateAnswer} from '../supabase/functions/analyze-meal/index.ts';

const origin='https://ritmo-diario-dupla.fastdrake26.chatgpt.site';
const image='data:image/jpeg;base64,/9j/'+('A'.repeat(100));
const requestId='00000000-0000-4000-8000-000000000001';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'test-public',SUPABASE_SERVICE_ROLE_KEY:'test-service',GEMINI_API_KEY:'test-gemini'};
const valid={is_food:true,title:'Arroz com frango',notes:'Porções aproximadas pela foto.',items:[{name:'Arroz',portion:'3 colheres',calories:150},{name:'Frango',portion:'1 filé',calories:250}]};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
function setup(options={}){
  const calls=[];
  const handler=createHandler({getEnv:name=>({...env,...options.env})[name],fetcher:async(url,init)=>{
    calls.push({url,init});
    if(url.endsWith('/auth/v1/user'))return response({id:'verified-user'},options.authStatus||200);
    if(url.includes('/rpc/'))return response(options.quota||{allowed:true,remaining:19},options.quotaStatus||200);
    if(options.providerThrow)throw new DOMException('Timed out','TimeoutError');
    return response(options.provider||{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(valid)}]}}]},options.providerStatus||200);
  }});
  return {calls,handler};
}
function request(body={},headers={}){return new Request('https://example.supabase.co/functions/v1/analyze-meal',{method:'POST',headers:{Origin:origin,Authorization:'Bearer user-session','Content-Type':'application/json',...headers},body:JSON.stringify({image,context:'',request_id:requestId,...body})});}
test('não chama IA nem quota sem uma sessão verificada',async()=>{
  const {handler,calls}=setup({authStatus:401});assert.equal((await handler(request())).status,401);assert.equal(calls.length,1);
  const noToken=new Request('https://example.test',{method:'GET'});assert.equal((await handler(noToken)).status,401);assert.equal(calls.length,1);
});
test('preflight não cobra, não autentica e recusa origens não autorizadas',async()=>{
  const {handler,calls}=setup();assert.equal((await handler(new Request('https://example.test',{method:'OPTIONS',headers:{Origin:origin}}))).status,204);
  assert.equal((await handler(request({},{Origin:'https://untrusted.example'}))).status,403);assert.equal(calls.length,0);
});
test('sem chave retorna indisponível e não consome limite',async()=>{
  const {handler,calls}=setup({env:{GEMINI_API_KEY:''}});const r=await handler(request());assert.equal(r.status,503);assert.equal((await r.json()).error,'AI_NOT_CONFIGURED');assert.equal(calls.length,1);
});
test('status autenticado não analisa nem consome limite',async()=>{
  const {handler,calls}=setup();const r=await handler(new Request('https://example.test',{headers:{Origin:origin,Authorization:'Bearer user-session'}}));assert.deepEqual(await r.json(),{available:true,daily_limit:20,provider:'gemini'});assert.equal(calls.length,1);
});
test('rejeita imagem remota, payload excessivo e contexto fora do limite antes da quota',async()=>{
  for(const body of [{image:'https://example.test/photo.jpg'},{context:'x'.repeat(501)},{request_id:'invalid'},{image:'data:image/jpeg;base64,AAAA'}]){
    const {handler,calls}=setup();assert.equal((await handler(request(body))).status,400);assert.equal(calls.length,1);
  }
  const {handler,calls}=setup();assert.equal((await handler(request({context:'x'.repeat(2*1024*1024)}))).status,413);assert.equal(calls.length,1);
});
test('limite diário bloqueia IA; só usa identidade validada pelo servidor',async()=>{
  const {handler,calls}=setup({quota:{allowed:false,reason:'daily_limit'}});const r=await handler(request({user_id:'forged-user'}));assert.equal(r.status,429);assert.equal(calls.length,2);assert.equal(JSON.parse(calls[1].init.body).p_user_id,'verified-user');
});
test('estrutura a resposta, calcula total e envia imagem inline ao Gemini com schema e chave só no servidor',async()=>{
  const {handler,calls}=setup();const r=await handler(request());const d=await r.json();assert.equal(r.status,200);assert.equal(d.total_calories,400);assert.equal(d.remaining,19);
  const sent=JSON.parse(calls[2].init.body);assert.equal(sent.store,false);assert.deepEqual(sent.generationConfig.responseJsonSchema.required,['is_food','title','items','notes']);assert.equal(sent.contents[0].parts[0].inlineData.data,image.split(',')[1]);assert.equal(calls[2].init.headers['x-goog-api-key'],'test-gemini');assert.equal(calls[2].url.includes('api.openai.com'),false);assert.equal(JSON.stringify(d).includes('test-gemini'),false);
});
test('foto sem alimento e recusa nunca produzem refeição inventada',async()=>{
  const {handler}=setup({provider:{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({is_food:false,title:'',items:[],notes:'Foto sem comida.'})}]}}]}});const r=await handler(request());assert.equal(r.status,422);assert.equal((await r.json()).error,'NO_FOOD');
  const refusal=setup({provider:{promptFeedback:{blockReason:'SAFETY'}}});assert.equal((await refusal.handler(request())).status,422);
});
test('valores inválidos ou absurdos são rejeitados',()=>{
  for(const calories of [-1,NaN,Infinity,1.5,20001])assert.throws(()=>validateEstimate({...valid,items:[{name:'Food',portion:'1 porção',calories}]}));
  assert.throws(()=>validateEstimate({...valid,items:[]}));assert.throws(()=>validateEstimate({...valid,title:''}));
});
test('falha do provedor, resposta incompleta e timeout viram mensagens controladas',async()=>{
  for(const options of [{providerStatus:401},{provider:{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[]}}]}},{providerThrow:true},{provider:{candidates:[{finishReason:'STOP',content:{parts:[{text:'not json'}]}}]}}]){
    const {handler}=setup(options);const r=await handler(request());assert.ok([502,503,504].includes(r.status));assert.equal(JSON.stringify(await r.json()).includes('test-gemini'),false);
  }
});
test('Gemini diferencia limite gratuito, chave inválida e indisponibilidade sem expor dados do provedor',async()=>{
 for(const [providerStatus,provider,expected] of [[429,{error:{status:'RESOURCE_EXHAUSTED'}},'AI_RATE_LIMIT'],[400,{error:{status:'FAILED_PRECONDITION'}},'AI_FREE_TIER_UNAVAILABLE'],[400,{error:{details:[{reason:'API_KEY_INVALID'}]}},'AI_KEY_INVALID'],[403,{error:{}},'AI_ACCESS_DENIED'],[404,{error:{}},'AI_MODEL_UNAVAILABLE']]){
  const {handler}=setup({providerStatus,provider});const r=await handler(request());assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:expected});
 }
});
test('OpenAI não é usado como fallback pago e chave antiga não ativa Gemini',async()=>{
 const {handler,calls}=setup({env:{GEMINI_API_KEY:'',OPENAI_API_KEY:'old-secret'}});const r=await handler(request());assert.equal(r.status,503);assert.equal(calls.length,1);
});


test('perguntas usam a mesma chave e quota, sem exigir nem enviar foto',async()=>{
 const answer={is_food_question:true,answer:'Qual é a marca e o peso do pacote? O tamanho varia.',calories_min:null,calories_max:null,portion:''};
 const {handler,calls}=setup({provider:{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(answer)}]}}]}});
 const r=await handler(request({mode:'question',question:'Quantas calorias tem um pacote de bisnaguinha?',image:undefined}));assert.equal(r.status,200);const body=await r.json();assert.equal(body.calories_min,null);assert.equal(body.remaining,19);
 const sent=JSON.parse(calls[2].init.body);assert.equal(calls[2].init.headers['x-goog-api-key'],'test-gemini');assert.equal(calls[1].url.includes('/rpc/reserve_meal_analysis'),true);assert.equal(sent.contents[0].parts.length,1);assert(!('inlineData' in sent.contents[0].parts[0]));assert.match(sent.systemInstruction.parts[0].text,/sem inventar/);
});
test('pergunta inválida é rejeitada antes de reservar quota',async()=>{
 for(const question of ['', 'x', 'a'.repeat(501), null]){const {handler,calls}=setup();const r=await handler(request({mode:'question',question}));assert.equal(r.status,400);assert.equal(calls.length,1);}
});
test('resposta textual valida porção e faixa; recusa não cria calorias',()=>{
 const valid={is_food_question:true,answer:'Estimativa para a porção informada.',calories_min:120,calories_max:160,portion:'1 pão de 50 g'};
 assert.equal(validateAnswer(valid).calories_max,160);
 for(const change of [{calories_max:100},{calories_min:-1},{calories_max:Infinity},{portion:''},{answer:'x'.repeat(1201)},{calories_min:null}])assert.throws(()=>validateAnswer({...valid,...change}));
 assert.equal(validateAnswer({...valid,is_food_question:false}).calories_max,null);
});
