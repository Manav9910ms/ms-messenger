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
const FCM_SW_PATH = "./firebase-messaging-sw.js";
const FCM_SW_SCOPE = "./fcm/";

let messaging = null;
let serviceWorkerRegistration = null;
let initialized = false;

async function getMessagingInstance() {
  if (messaging) return messaging;
  if (!(await isSupported())) return null;
  messaging = getMessaging(app);
  return messaging;
}

async function registerMessagingServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;

  serviceWorkerRegistration = await navigator.serviceWorker.register(
    FCM_SW_PATH,
    { scope: FCM_SW_SCOPE }
  );

  return serviceWorkerRegistration;
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
    const registration =
      serviceWorkerRegistration || await registerMessagingServiceWorker();

    const token = await getToken(supportedMessaging, {
      serviceWorkerRegistration: registration
    });

    if (!token) {
      showToast("Unable to register this device for notifications.", "error");
      return false;
    }

    await saveToken(token);
    showToast("Notifications enabled.", "success");
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

  notificationBtn?.addEventListener("click", () => {
    void registerPushToken();
  });

  updateNotificationButton();

  const supportedMessaging = await getMessagingInstance();
  if (!supportedMessaging) return;

  await registerMessagingServiceWorker();
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
    const token = await getToken(messaging, {
      serviceWorkerRegistration: serviceWorkerRegistration || undefined
    });
    if (token) await removeToken(token, uid);
  } catch (error) {
    console.error("Notification token cleanup failed:", error);
  }
}

window.addEventListener("ms-auth-ready", ({ detail }) => {
  if (detail?.user) {
    updateNotificationButton();
    void initNotifications();
  }
});
