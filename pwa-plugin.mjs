import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
export default function pwa(){
  let base='/';
  return {name:'ritmo-pwa',configResolved(config){base=config.base;},generateBundle(_options,bundle){
    const files=Object.keys(bundle).filter(name=>name==='index.html'||name.startsWith('assets/'));
    const publicFiles=['ritmo-logo.png','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','manifest.webmanifest'];
    const hash=createHash('sha256');for(const file of files){const entry=bundle[file];hash.update(entry.type==='chunk'?entry.code:entry.source);}for(const file of publicFiles)hash.update(readFileSync(new URL(`./public/${file}`,import.meta.url)));
    const prefix=`ritmo-shell-${encodeURIComponent(base)}-`;
    const cache=`${prefix}${hash.digest('hex').slice(0,16)}`;
    const assets=[base,...files.filter(x=>x!=='index.html').map(x=>base+x),...publicFiles.map(x=>base+x)];
    this.emitFile({type:'asset',fileName:'sw.js',source:`
const PREFIX=${JSON.stringify(prefix)}, CACHE=${JSON.stringify(cache)}, ASSETS=${JSON.stringify(assets)}, BASE=${JSON.stringify(base)};
const allowed=new Set(ASSETS.map(path=>new URL(path,self.location.origin).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
 if(request.mode==='navigate'){
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(BASE))||fetch(request)));return;
 }
 if(!allowed.has(url.href))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request))||fetch(request)));
});`});
  }};
}
