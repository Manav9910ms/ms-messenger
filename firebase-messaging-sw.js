importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

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

  const title = data.senderName
    ? `New message from ${data.senderName}`
    : notification.title || "MS Connect";

  const body = data.body || notification.body || "You have a new message.";

  self.registration.showNotification(title, {
    body,
    icon: "./icon-192.png",
    badge: "./favicon.png",
    tag: data.conversationId || "ms-connect-message",
    renotify: true,
    data: {
      conversationId: data.conversationId || "",
      senderUid: data.senderUid || ""
    }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL("./", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }

      return undefined;
    })
  );
});
