const PREVIEW=['127.0.0.1:4318','localhost:4318'].includes(self.location.host);
const CACHE_PREFIX=PREVIEW?'duye-weapons-preview-':'nightreign-offline-';
const CACHE=CACHE_PREFIX+'v0.5.0-panels-r3-final';
const ASSETS=["./", "./index.html", "./style.css", "./app.js", "./catalog.js", "./weapons.js", "./weapons.css", "./circle-timer.js", "./circle-timer.css", "./data.js", "./manifest.webmanifest", "./DATA-LICENSE.txt", "./assets/great-hollow.webp", "./assets/icon.svg", "./assets/rain-knight.png", "./assets/大空洞地表水晶原图.jpg", "./assets/nightlords/adel.webp", "./assets/nightlords/caligo.webp", "./assets/nightlords/fulghor.webp", "./assets/nightlords/gladius.webp", "./assets/nightlords/gnoster.webp", "./assets/nightlords/harmonia.avif", "./assets/nightlords/heolstor.webp", "./assets/nightlords/libra.webp", "./assets/nightlords/maris.webp", "./assets/nightlords/straghess.avif", "./assets/types/fire.png", "./assets/types/holy.png", "./assets/types/lightning.png", "./assets/types/magic.png", "./assets/types/pierce.png", "./assets/types/slash.png", "./assets/types/standard.png", "./assets/types/strike.png"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}
  return response;
 }).catch(()=>caches.match(event.request).then(cached=>cached||(event.request.mode==='navigate'?caches.match('./index.html'):new Response('Offline asset unavailable',{status:503})))));
});

