const CACHE_NAME =
"ms-messenger-v10";

const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./auth.js",
  "./users.js",
  "./messages.js",
  "./calls.js",
  "./presence.js",
  "./firebase.js",
  "./manifest.json",
  "./favicon.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener(
  "install",
  (event)=>{
    event.waitUntil(
      caches
      .open(CACHE_NAME)
      .then((cache)=> cache.addAll(urlsToCache))
    );

    self.skipWaiting();
  }
);

self.addEventListener(
  "activate",
  (event)=>{
    event.waitUntil(
      caches.keys().then((keys)=>{
        return Promise.all(
          keys
          .filter((key)=> key !== CACHE_NAME)
          .map((key)=> caches.delete(key))
        );
      })
    );

    self.clients.claim();
  }
);

self.addEventListener(
  "fetch",
  (event)=>{
    const { request } = event;
    const url = new URL(request.url);

    if(request.method !== "GET"){
      return;
    }

    if(url.origin !== self.location.origin){
      return;
    }

    if(request.mode === "navigate"){
      event.respondWith(
        fetch(request).catch(()=> caches.match("./index.html"))
      );
      return;
    }

    const isAppCodeRequest =
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "document";

    if(isAppCodeRequest){
      event.respondWith(
        fetch(request)
        .then((response)=>{
          if(response && response.status === 200){
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache)=>{
              cache.put(request,responseToCache);
            });
          }
          return response;
        })
        .catch(()=> caches.match(request))
      );
      return;
    }

    event.respondWith(
      caches.match(request).then((cached)=>{
        if(cached){
          return cached;
        }

        return fetch(request)
        .then((response)=>{
          if(!response || response.status !== 200){
            return response;
          }

          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache)=>{
            cache.put(request,responseToCache);
          });

          return response;
        });
      })
    );
  }
);
