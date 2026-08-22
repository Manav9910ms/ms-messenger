importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const CACHE_NAME = "ms-connect-v14";

firebase.initializeApp({
  apiKey: "AIzaSyB92P1v8_9hPLhgqN5YmUzUXF_IIuD7Al0",
  authDomain: "ms-messenger-sys.firebaseapp.com",
  projectId: "ms-messenger-sys",
  storageBucket: "ms-messenger-sys.firebasestorage.app",
  messagingSenderId: "761516646845",
  appId: "1:761516646845:web:a574e6677fcc9f826872d4"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const notification = payload?.notification || {};

  const title = notification.title ||
    (data.senderName ? `New message from ${data.senderName}` : "MS Connect");
  const body = notification.body || data.body || "You have a new message.";

  self.registration.showNotification(title, {
    body,
    icon: "./icon-192.png",
    badge: "./favicon.png",
    tag: data.senderUid ? `message-${data.senderUid}` : "ms-connect-message",
    renotify: true,
    data: {
      senderUid: data.senderUid || "",
      messageId: data.messageId || ""
    }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL("./", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }

      return self.clients.openWindow?.(target);
    })
  );
});

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
  "./typing.js",
  "./firebase.js",
  "./firebase-config.js",
  "./utils.js",
  "./notifications.js",
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
