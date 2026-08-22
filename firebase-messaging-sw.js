importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyC8FJX7mJ8d9wB8k2o6tN9hQ0a1Bc2De3F",
  authDomain: "ms-messenger-6f0f6.firebaseapp.com",
  projectId: "ms-messenger-6f0f6",
  storageBucket: "ms-messenger-6f0f6.appspot.com",
  messagingSenderId: "1079307021117",
  appId: "1:1079307021117:web:4b96f7b2bbd0f0a2d9d9b5"
};

firebase.initializeApp(firebaseConfig);
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
