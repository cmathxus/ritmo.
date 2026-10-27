type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export let installEvent:InstallEvent|null=null;
export function takeInstallEvent(){const event=installEvent;installEvent=null;return event;}
export let registration:ServiceWorkerRegistration|undefined;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event as InstallEvent;window.dispatchEvent(new Event('ritmo-install-ready'));});
window.addEventListener('appinstalled',()=>{installEvent=null;window.dispatchEvent(new Event('ritmo-installed'));});
export function installed(){return window.matchMedia('(display-mode: standalone)').matches||!!(navigator as Navigator&{standalone?:boolean}).standalone;}
export function startPwa(){
 if(!import.meta.env.PROD||!('serviceWorker' in navigator))return;
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL,updateViaCache:'none'}).then(reg=>{
   registration=reg;
   const notify=()=>{if(reg.waiting&&navigator.serviceWorker.controller)window.dispatchEvent(new Event('ritmo-update-ready'));};
   notify();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',notify));
   const check=()=>{if(document.visibilityState==='visible'&&navigator.onLine)void reg.update().catch(()=>{});};
   document.addEventListener('visibilitychange',check);window.addEventListener('online',check);
  }).catch(()=>{/* Installation remains optional if browser blocks workers. */});
 });
}
