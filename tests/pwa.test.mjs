import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import pwa from '../pwa-plugin.mjs';
import {readFileSync} from 'node:fs';
function worker(base='/ritmo./'){
 const plugin=pwa();plugin.configResolved({base});let output;
 plugin.generateBundle.call({emitFile:file=>output=file.source},{},{'index.html':{type:'asset',source:'<html>Ritmo</html>'},'assets/app-123.js':{type:'chunk',code:'app'}});
 const handlers={},stored=new Map(),deleted=[];let installedAssets=[],claimed=false,skip=false;
 const cache={addAll:async assets=>{installedAssets=assets;},match:async key=>stored.get(typeof key==='string'?key:key.url)};
 const context={URL,Set,Promise,caches:{open:async()=>cache,keys:async()=>['unrelated','ritmo-shell-%2Fritmo.%2F-old','ritmo-shell-%2Fother%2F-old'],delete:async key=>deleted.push(key)},fetch:async()=>{throw Error('offline');},self:{location:{origin:'https://example.com'},clients:{claim:async()=>{claimed=true;}},skipWaiting:()=>{skip=true;},addEventListener:(type,fn)=>handlers[type]=fn}};
 vm.runInNewContext(output,context);
 return {handlers,stored,deleted,get assets(){return installedAssets;},get claimed(){return claimed;},get skip(){return skip;}};
}
test('PWA precache respects Pages base and includes only public app files',async()=>{
 const w=worker();let job;w.handlers.install({waitUntil:p=>job=p});await job;
 assert(w.assets.includes('/ritmo./'));assert(w.assets.includes('/ritmo./assets/app-123.js'));assert(w.assets.includes('/ritmo./icon-512.png'));
 assert(w.assets.every(x=>x.startsWith('/ritmo./')));
 let rootJob;const root=worker('/');root.handlers.install({waitUntil:p=>rootJob=p});await rootJob;assert(root.assets.includes('/'));
});
test('worker ignores private requests and serves cached shell offline without caching auth query',async()=>{
 const w=worker();for(const request of [{url:'https://project.supabase.co/rest/v1/meals',method:'GET'},{url:'https://example.com/ritmo./private.json',method:'GET'},{url:'https://example.com/ritmo./',method:'POST'},{url:'https://example.com/another/',method:'GET'}])w.handlers.fetch({request,respondWith:()=>assert.fail('Private or unrelated request intercepted')});
 w.stored.set('/ritmo./','public-shell');let response;
 w.handlers.fetch({request:{url:'https://example.com/ritmo./?code=private-auth-code',method:'GET',mode:'navigate'},respondWith:p=>response=p});assert.equal(await response,'public-shell');assert.equal(w.stored.size,1);
});
test('updates require explicit activation and cleanup stays within app scope',async()=>{
 const w=worker();assert.equal(w.skip,false);w.handlers.message({data:'ACTIVATE_UPDATE'});assert.equal(w.skip,true);
 let job;w.handlers.activate({waitUntil:p=>job=p});await job;assert.deepEqual(w.deleted,['ritmo-shell-%2Fritmo.%2F-old']);assert.equal(w.claimed,true);
});
test('manifest contains installable square PNG icons and relative scope',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.display,'standalone');
 for(const size of [192,512]){const icon=manifest.icons.find(i=>i.sizes===`${size}x${size}`);assert(icon);const bytes=readFileSync(new URL(`../public/${icon.src}`,import.meta.url));assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
});
