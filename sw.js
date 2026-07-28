const CACHE="garaje-v1";
const ASSETS=["/","index.html"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch",e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match("index.html"))));
});

// Notificaciones push
self.addEventListener("push",e=>{
  const data=e.data?.json()||{};
  e.waitUntil(self.registration.showNotification(data.title||"Mi Garaje",{
    body:data.body||"",
    icon:"/icon.png",
    badge:"/icon.png",
    tag:data.tag||"garaje",
    data:{url:data.url||"/"}
  }));
});

self.addEventListener("notificationclick",e=>{
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url||"/"));
});

// Comprobar vencimientos y enviar notificaciones (se ejecuta periódicamente)
self.addEventListener("periodicsync",e=>{
  if(e.tag==="check-vencimientos")e.waitUntil(checkVencimientos());
});

async function checkVencimientos(){
  try{
    const cache=await caches.open("garaje-data");
    const r=await cache.match("data");
    if(!r)return;
    const data=await r.json();
    const today=new Date();today.setHours(0,0,0,0);
    (data.vehicles||[]).forEach(v=>{
      const checks=[
        {date:v.itv?.expiry,label:`ITV de ${v.name||"tu coche"}`},
        {date:v.insurance?.expiry,label:`Seguro de ${v.name||"tu coche"}`},
        {date:v.ivtm?.nextExpiry,label:`IVTM de ${v.name||"tu coche"}`},
      ];
      checks.forEach(({date,label})=>{
        if(!date)return;
        const d=new Date(date);d.setHours(0,0,0,0);
        const dias=Math.round((d-today)/86400000);
        if(dias===30||dias===7||dias===1||dias===0){
          self.registration.showNotification("⚠️ "+label,{
            body:dias===0?"¡Vence HOY!":`Vence en ${dias} día${dias>1?"s":""}`,
            icon:"/icon.png",tag:label
          });
        }
      });
    });
  }catch(e){}
}
