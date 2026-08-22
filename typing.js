import {
  currentUser,
  selectedUser,
  realtimeDb
} from "./firebase.js";

import {
  onValue,
  ref,
  remove,
  set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const TYPING_TIMEOUT = 1800;

let unsubscribeTyping = null;
let typingTimer = null;
let activeReceiverUid = null;

function typingRef(receiverUid, senderUid = currentUser?.uid) {
  if (!receiverUid || !senderUid) return null;
  return ref(realtimeDb, `typing/${receiverUid}/${senderUid}`);
}

function renderTypingState() {
  const status = document.getElementById("chatUserStatus");
  if (!status || !currentUser || !selectedUser) return;

  const typingRefForUser = ref(realtimeDb, `typing/${currentUser.uid}`);

  unsubscribeTyping?.();
  unsubscribeTyping = onValue(typingRefForUser, (snapshot) => {
    const active = snapshot.child(selectedUser.uid).val() === true;

    if (active) {
      status.textContent = "Typing…";
      status.classList.add("typingActive");
    } else {
      status.textContent = "";
      status.classList.remove("typingActive");
    }
  }, (error) => {
    console.error("Typing listener failed:", error);
  });
}

export function initTyping() {
  window.addEventListener("selected-user-changed", renderTypingState);

  window.addEventListener("ms-auth-ready", ({ detail }) => {
    if (!detail?.user) {
      stopTyping();
      unsubscribeTyping?.();
      unsubscribeTyping = null;
      return;
    }

    renderTypingState();
  });
}

export async function setTyping(isTyping) {
  if (!currentUser || !selectedUser) return;

  const receiverUid = selectedUser.uid;
  const targetRef = typingRef(receiverUid);
  if (!targetRef) return;

  if (isTyping) {
    activeReceiverUid = receiverUid;

    try {
      await set(targetRef, true);
    } catch (error) {
      console.error("Unable to publish typing state:", error);
    }

    clearTimeout(typingTimer);
    typingTimer = window.setTimeout(() => {
      void setTyping(false);
    }, TYPING_TIMEOUT);
    return;
  }

  if (activeReceiverUid !== receiverUid) return;

  clearTimeout(typingTimer);
  typingTimer = null;
  activeReceiverUid = null;

  try {
    await remove(targetRef);
  } catch (error) {
    console.error("Unable to clear typing state:", error);
  }
}

export function stopTyping() {
  clearTimeout(typingTimer);
  typingTimer = null;

  if (!currentUser || !activeReceiverUid) {
    activeReceiverUid = null;
    return;
  }

  const targetRef = typingRef(activeReceiverUid);
  activeReceiverUid = null;

  if (targetRef) {
    void remove(targetRef).catch((error) => {
      console.error("Unable to clear typing state:", error);
    });
  }
}
