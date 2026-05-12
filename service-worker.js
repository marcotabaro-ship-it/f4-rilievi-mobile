var CACHE_NAME = 'f4-mobile-v8';
var APP_SHELL = [
  '/f4-rilievi-mobile/login.html',
  '/f4-rilievi-mobile/home.html',
  '/f4-rilievi-mobile/cliente.html',
  '/f4-rilievi-mobile/cliente-nuovo.html',
  '/f4-rilievi-mobile/cantiere-nuovo.html',
  '/f4-rilievi-mobile/rilievo-serr.html',
  '/f4-rilievi-mobile/rilievo-serr-nuovo.html',
  '/f4-rilievi-mobile/rilievo-porte.html',
  '/f4-rilievi-mobile/rilievo-porte-novo.html',
  '/f4-rilievi-mobile/pos-serr-edit.html',
  '/f4-rilievi-mobile/pos-porte-edit.html',
  '/f4-rilievi-mobile/rilievo-edit.html',
  '/f4-rilievi-mobile/capitoli.html',
  '/f4-rilievi-mobile/stratigrafie.html',
  '/f4-rilievi-mobile/guida.html',
  '/f4-rilievi-mobile/css/mobile.css',
  '/f4-rilievi-mobile/js/config.js',
  '/f4-rilievi-mobile/js/auth.js',
  '/f4-rilievi-mobile/js/db-local.js',
  '/f4-rilievi-mobile/js/api-mobile.js'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    }).catch(function(err){
      console.warn('SW cache prefill parziale:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys
          .filter(function(k){ return k !== CACHE_NAME; })
          .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  var url = e.request.url;
  if(url.indexOf('supabase.co') > -1) return;
  if(url.indexOf('fonts.googleapis.com') > -1) return;
  if(url.indexOf('fonts.gstatic.com') > -1) return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(resp){
        if(!resp || resp.status !== 200 || resp.type === 'opaque') return resp;
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, clone); });
        return resp;
      }).catch(function(){
        return caches.match('/f4-rilievi-mobile/home.html');
      });
    })
  );
});
