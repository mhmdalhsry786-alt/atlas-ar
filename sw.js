/* أتلس — Service Worker: يعمل بلا إنترنت بالكامل */
const VERSION = "atlas-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./names.json",
              "./icon-180.png", "./icon-192.png", "./icon-512.png"];
const MODELS = ["./models/skeleton.glb","./models/muscular.glb","./models/visceral.glb",
                "./models/cardiovascular.glb","./models/nervous.glb"];
const VENDOR = ["./vendor/three.module.js","./vendor/GLTFLoader.js","./vendor/DRACOLoader.js",
                "./vendor/BufferGeometryUtils.js","./vendor/draco/draco_decoder.js",
                "./vendor/draco/draco_decoder.wasm","./vendor/draco/draco_wasm_wrapper.js"];

self.addEventListener("install", e=>{
  e.waitUntil((async()=>{
    const c = await caches.open(VERSION);
    // الملفات الصغيرة أولًا
    await Promise.all(CORE.map(u=>c.add(new Request(u,{cache:"reload"})).catch(()=>{})));
    await Promise.all(VENDOR.map(u=>c.add(new Request(u,{cache:"reload"})).catch(()=>{})));
    // النماذج الكبيرة (لا تُفشل التثبيت إن تأخر أحدها)
    await Promise.all(MODELS.map(u=>c.add(new Request(u,{cache:"reload"})).catch(()=>{})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e=>{
  e.waitUntil((async()=>{
    const ks = await caches.keys();
    await Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method!=="GET") return;
  const url = new URL(req.url);
  if(url.origin!==self.location.origin) return;

  e.respondWith((async()=>{
    const c = await caches.open(VERSION);
    const hit = await c.match(req, {ignoreSearch:true});
    if(hit) return hit;
    try{
      const res = await fetch(req);
      if(res && res.ok && res.type==="basic") c.put(req, res.clone()).catch(()=>{});
      return res;
    }catch(_){
      if(req.mode==="navigate"){
        const idx = await c.match("./index.html");
        if(idx) return idx;
      }
      return new Response("غير متصل", {status:503, headers:{"Content-Type":"text/plain; charset=utf-8"}});
    }
  })());
});

self.addEventListener("message", e=>{
  if(e.data==="ping" && e.source) e.source.postMessage({type:"pong", version:VERSION});
});
