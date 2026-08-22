import {
  auth,
  db,
  app
} from "./firebase.js";

import {
  doc,
  deleteDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

import { showToast } from "./utils.js";

const notificationBtn = document.getElementById("notificationBtn");

let messaging = null;
let initialized = false;

async function getMessagingInstance() {
  if (messaging) return messaging;
  if (!(await isSupported())) return null;
  messaging = getMessaging(app);
  return messaging;
}

async function getAppServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error("Service worker is not ready:", error);
    return null;
  }
}

function updateNotificationButton() {
  if (!notificationBtn || !auth.currentUser) return;

  if (!("Notification" in window) || Notification.permission === "granted") {
    notificationBtn.hidden = true;
    return;
  }

  notificationBtn.hidden = false;
  notificationBtn.disabled = Notification.permission === "denied";
  notificationBtn.textContent =
    Notification.permission === "denied"
      ? "Notifications Blocked"
      : "Enable Notifications";
}

async function saveToken(token) {
  if (!auth.currentUser || !token) return;

  const tokenRef = doc(
    db,
    "users",
    auth.currentUser.uid,
    "fcmTokens",
    token
  );

  await setDoc(tokenRef, {
    token,
    uid: auth.currentUser.uid,
    createdAt: Date.now(),
    platform: "web"
  }, { merge: true });
}

async function removeToken(token, uid = auth.currentUser?.uid) {
  if (!uid || !token) return;

  try {
    await deleteDoc(doc(db, "users", uid, "fcmTokens", token));
  } catch (error) {
    console.error("Unable to remove notification token:", error);
  }
}

async function registerPushToken() {
  if (!auth.currentUser) return false;

  const supportedMessaging = await getMessagingInstance();
  if (!supportedMessaging) {
    showToast("Push notifications are not supported in this browser.", "error");
    return false;
  }

  if (!("Notification" in window)) {
    showToast("This browser does not support notifications.", "error");
    return false;
  }

  const permission = await Notification.requestPermission();
  updateNotificationButton();

  if (permission !== "granted") {
    if (permission === "denied") {
      showToast("Notifications are blocked for this site.", "error");
    }
    return false;
  }

  try {
    const registration = await getAppServiceWorker();
    if (!registration) {
      showToast("Notification service is not ready. Please refresh.", "error");
      return false;
    }

    const token = await getToken(supportedMessaging, {
      serviceWorkerRegistration: registration
    });

    if (!token) {
      showToast("Unable to register this device for notifications.", "error");
      return false;
    }

    await saveToken(token);
    return true;
  } catch (error) {
    console.error("Push registration failed:", error);
    showToast("Unable to enable notifications. Check browser permissions.", "error");
    return false;
  }
}

async function handleForegroundMessage(payload) {
  const notification = payload?.notification || {};
  const data = payload?.data || {};

  if (!notification.title && !data.senderName) return;

  showToast(
    `${data.senderName || notification.title || "New message"}${data.body || notification.body ? `: ${data.body || notification.body}` : ""}`,
    "info"
  );
}

export async function initNotifications() {
  if (initialized) return;
  initialized = true;

  notificationBtn?.addEventListener("click", async () => {
    const enabled = await registerPushToken();
    if (enabled) showToast("Notifications enabled.", "success");
  });

  updateNotificationButton();

  const supportedMessaging = await getMessagingInstance();
  if (!supportedMessaging) return;

  onMessage(supportedMessaging, (payload) => {
    void handleForegroundMessage(payload);
  });
}

export async function enableNotifications() {
  return registerPushToken();
}

export async function clearNotificationToken() {
  const uid = auth.currentUser?.uid;
  if (!uid || !messaging) return;

  try {
    const registration = await getAppServiceWorker();
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration || undefined
    });
    if (token) await removeToken(token, uid);
  } catch (error) {
    console.error("Notification token cleanup failed:", error);
  }
}

window.addEventListener("ms-auth-ready", ({ detail }) => {
  if (!detail?.user) {
    if (notificationBtn) notificationBtn.hidden = true;
    return;
  }

  updateNotificationButton();
  void initNotifications().then(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      void registerPushToken();
    }
  });
});
