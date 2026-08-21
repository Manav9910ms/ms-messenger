import {
  realtimeDb
} from "./firebase.js";

import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { formatLastSeen } from "./utils.js";

export function applyStatus(uid, element) {
  if (!uid || !element) return () => {};

  const statusRef = ref(realtimeDb, `status/${uid}`);

  return onValue(statusRef, (snapshot) => {
    const status = snapshot.val();

    if (status?.online) {
      element.textContent = "Online";
      element.classList.add("online");
      return;
    }

    element.classList.remove("online");
    element.textContent = status?.lastSeen
      ? formatLastSeen(status.lastSeen)
      : "Offline";
  });
}
