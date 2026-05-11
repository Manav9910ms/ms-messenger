const CACHE_NAME =
"ms-messenger-v8";

const urlsToCache = [

  "./",

  "./index.html",

  "./style.css",

  "./script.js",

  "./auth.js",

  "./users.js",

  "./messages.js",

  "./presence.js",

  "./firebase.js",

  "./manifest.json",

  "./favicon.png",

  "./icon-192.png",

  "./icon-512.png"

];

// INSTALL

self.addEventListener(
  "install",
  (event)=>{

    event.waitUntil(

      caches.open(
        CACHE_NAME
      )
      .then((cache)=>{

        return cache.addAll(
          urlsToCache
        );

      })

    );

  }
);

// FETCH

self.addEventListener(
  "fetch",
  (event)=>{

    event.respondWith(

      caches.match(
        event.request
      )
      .then((response)=>{

        return (
          response ||

          fetch(
            event.request
          )
        );

      })

    );

  }
);
