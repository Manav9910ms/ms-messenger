const CACHE_NAME = "ms-connect-v11";

const APP_SHELL = [
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
  "./firebase-config.js",
  "./utils.js",
  "./manifest.json",
  "./favicon.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  const isAppAsset = ["script", "style", "image", "font"].includes(
    request.destination
  );

  if (!isAppAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkRequest = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkRequest;
    })
  );
});
