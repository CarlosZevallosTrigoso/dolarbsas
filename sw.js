/* dolarbsas · service worker
   App shell cache-first con actualización en segundo plano.
   Las APIs (dolarapi, er-api, github) van siempre por red:
   el fallback offline de cotizaciones ya lo maneja index.html
   vía localStorage. */
'use strict';
var CACHE='dolarbsas-v3';
var ASSETS=['./','./index.html','./gastos.html','./core.js','./manifest.webmanifest','./icon.svg'];

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; })
        .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET') return;
  var url=new URL(e.request.url);
  if(url.origin!==self.location.origin) return; // APIs y fonts: red directa
  e.respondWith(
    caches.match(e.request).then(function(hit){
      var net=fetch(e.request).then(function(res){
        if(res && res.ok){
          var cp=res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request,cp); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});
