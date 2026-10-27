import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {transformSync} from 'esbuild';
function runtime(){
 const script=transformSync(readFileSync(new URL('../src/pwa-runtime.ts',import.meta.url),'utf8'),{loader:'ts',format:'iife',globalName:'pwa',define:{'import.meta.env.PROD':'true','import.meta.env.BASE_URL':'"/ritmo./"'}}).code;
 const handlers=new Map();let timeout,reloads=0,sent;
 const reg={waiting:{postMessage:message=>sent=message},addEventListener(){}};
 const serviceWorker={register:async()=>reg,addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:type=>handlers.delete(type)};
 const context={window:{addEventListener(){},dispatchEvent(){}},document:{readyState:'complete',addEventListener(){}},navigator:{serviceWorker,onLine:true},location:{reload:()=>reloads++},setTimeout:fn=>{timeout=fn;return 1;},clearTimeout(){timeout=undefined;},Event};
 vm.runInNewContext(script,context);
 return {context,reg,handlers,get timeout(){return timeout;},get reloads(){return reloads;},get sent(){return sent;}};
}
test('PWA reload waits for controller transition and happens once',async()=>{
 const r=runtime();r.context.pwa.startPwa();await Promise.resolve();const activation=r.context.pwa.activatePwaUpdate();assert.equal(r.sent,'ACTIVATE_UPDATE');assert.equal(r.reloads,0);r.handlers.get('controllerchange')();await activation;assert.equal(r.reloads,1);assert.equal(r.timeout,undefined);
});
test('failed activation exits waiting state without reloading',async()=>{
 const r=runtime();r.context.pwa.startPwa();await Promise.resolve();const activation=r.context.pwa.activatePwaUpdate();r.timeout();await assert.rejects(activation,/demorou/);assert.equal(r.reloads,0);assert.equal(r.handlers.size,0);
});
test('recovery only removes Ritmo caches/worker and preserves URL auth data',async()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');const code=html.match(/<script>([\s\S]*?)<\/script>/)[1].replaceAll('%BASE_URL%','/ritmo./');
 let retry,next;const deleted=[],unregistered=[];const nodes={'boot-recovery':{style:{}},'boot-help':{},'boot-retry':{addEventListener:(_type,fn)=>retry=fn}};
 const context={document:{getElementById:id=>nodes[id]},window:{addEventListener(){}},navigator:{onLine:true,serviceWorker:{getRegistrations:async()=>[{scope:'https://example.com/ritmo./',unregister:async()=>unregistered.push('ritmo')},{scope:'https://example.com/other/',unregister:async()=>unregistered.push('other')}]}},location:{href:'https://example.com/ritmo./?code=keep-me',origin:'https://example.com',replace:url=>next=url},caches:{keys:async()=>['ritmo-shell-%2Fritmo.%2F-broken','other-cache'],delete:async name=>deleted.push(name)},setTimeout(){},URL,Date};context.window.caches=context.caches;
 vm.runInNewContext(code,context);await retry.call(nodes['boot-retry']);assert.deepEqual(deleted,['ritmo-shell-%2Fritmo.%2F-broken']);assert.deepEqual(unregistered,['ritmo']);assert.equal(new URL(next).searchParams.get('code'),'keep-me');assert(new URL(next).searchParams.has('ritmo-recover'));
});
