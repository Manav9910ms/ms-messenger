import {
  db,
  currentUser,
  selectedUser
} from "./firebase.js";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { showToast } from "./utils.js";

let unsubscribeChatA = null;
let unsubscribeChatB = null;
let unsubscribeUnread = null;
let renderTimer = null;
const renderedMessages = new Map();

const messagesCollection = collection(db, "messages");

function getMessageKey(data) {
  return `${data.time || 0}:${data.senderUid || ""}:${data.receiverUid || ""}:${data.text || ""}`;
}

function renderMessages() {
  const chat = document.getElementById("chatMessages");
  if (!chat || !currentUser || !selectedUser) return;

  const previousScrollHeight = chat.scrollHeight;
  const wasNearBottom =
    chat.scrollHeight - chat.scrollTop - chat.clientHeight < 120;

  const messages = [...renderedMessages.values()]
    .filter((data) => {
      const direct =
        data.senderUid === currentUser.uid &&
        data.receiverUid === selectedUser.uid;
      const reverse =
        data.senderUid === selectedUser.uid &&
        data.receiverUid === currentUser.uid;
      return direct || reverse;
    })
    .sort((a, b) => (a.time || 0) - (b.time || 0));

  chat.replaceChildren();

  for (const data of messages) {
    const div = document.createElement("div");
    div.className = `message ${data.senderUid === currentUser.uid ? "me" : "other"}`;

    const textDiv = document.createElement("div");
    textDiv.textContent = data.text || "";

    const timeDiv = document.createElement("div");
    timeDiv.className = "time";

    const time = data.time
      ? new Date(data.time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      : "";

    let receipt = "";
    if (data.senderUid === currentUser.uid) {
      receipt = data.seen ? " ✓✓" : " ✓";
    }

    timeDiv.textContent = `${time}${receipt}`;
    div.append(textDiv, timeDiv);
    chat.appendChild(div);
  }

  if (wasNearBottom || !previousScrollHeight) {
    chat.scrollTop = chat.scrollHeight;
  }
}

async function markIncomingMessagesSeen(snapshot) {
  if (!currentUser || !selectedUser) return;

  const unseenDocs = [];

  snapshot.forEach((messageDoc) => {
    const data = messageDoc.data();
    if (
      data.receiverUid === currentUser.uid &&
      data.senderUid === selectedUser.uid &&
      !data.seen
    ) {
      unseenDocs.push(messageDoc.id);
    }
  });

  if (!unseenDocs.length) return;

  try {
    const batch = writeBatch(db);
    unseenDocs.forEach((id) => {
      batch.update(doc(db, "messages", id), { seen: true });
    });
    await batch.commit();
  } catch (error) {
    console.error("Unable to mark messages as seen:", error);
  }
}

function handleChatSnapshot(snapshot) {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "removed") {
      const old = renderedMessages.get(change.doc.id);
      if (old) renderedMessages.delete(change.doc.id);
      return;
    }

    renderedMessages.set(change.doc.id, change.doc.data());
  });

  renderMessages();
  void markIncomingMessagesSeen(snapshot);
}

export function loadMessages() {
  if (!currentUser || !selectedUser) return;

  unsubscribeChatA?.();
  unsubscribeChatB?.();
  unsubscribeChatA = null;
  unsubscribeChatB = null;
  renderedMessages.clear();

  const qSent = query(
    messagesCollection,
    where("senderUid", "==", currentUser.uid),
    where("receiverUid", "==", selectedUser.uid),
    orderBy("time", "asc")
  );

  const qReceived = query(
    messagesCollection,
    where("senderUid", "==", selectedUser.uid),
    where("receiverUid", "==", currentUser.uid),
    orderBy("time", "asc")
  );

  unsubscribeChatA = onSnapshot(
    qSent,
    handleChatSnapshot,
    (error) => {
      console.error("Sent messages listener failed:", error);
      showToast("Unable to load this chat.", "error");
    }
  );

  unsubscribeChatB = onSnapshot(
    qReceived,
    handleChatSnapshot,
    (error) => {
      console.error("Received messages listener failed:", error);
      showToast("Unable to load this chat.", "error");
    }
  );
}

export function stopMessages() {
  unsubscribeChatA?.();
  unsubscribeChatB?.();
  unsubscribeUnread?.();
  unsubscribeChatA = null;
  unsubscribeChatB = null;
  unsubscribeUnread = null;
  renderedMessages.clear();

  const chat = document.getElementById("chatMessages");
  if (chat) chat.replaceChildren();
}

export function loadUnreadCounts() {
  unsubscribeUnread?.();
  unsubscribeUnread = null;

  if (!currentUser) return;

  const unreadQuery = query(
    messagesCollection,
    where("receiverUid", "==", currentUser.uid),
    where("seen", "==", false),
    orderBy("time", "desc")
  );

  unsubscribeUnread = onSnapshot(
    unreadQuery,
    (snapshot) => {
      document.querySelectorAll(".unreadBadge").forEach((badge) => {
        badge.style.display = "none";
        badge.textContent = "";
      });

      const counts = new Map();

      snapshot.forEach((messageDoc) => {
        const data = messageDoc.data();
        if (!data.senderUid) return;
        counts.set(
          data.senderUid,
          (counts.get(data.senderUid) || 0) + 1
        );
      });

      counts.forEach((count, senderUid) => {
        const badge = document.getElementById(`unread-${senderUid}`);
        if (!badge) return;

        badge.style.display = "flex";
        badge.textContent = count > 99 ? "99+" : String(count);
      });
    },
    (error) => {
      console.error("Unread listener failed:", error);
    }
  );
}

export async function sendMessage() {
  if (!currentUser || !selectedUser) {
    showToast("Select a user first.", "error");
    return;
  }

  const input = document.getElementById("messageInput");
  const text = input?.value.trim();
  if (!text) return;

  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) sendBtn.disabled = true;

  try {
    const { addDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
    );

    await addDoc(messagesCollection, {
      senderUid: currentUser.uid,
      receiverUid: selectedUser.uid,
      text,
      time: Date.now(),
      seen: false
    });

    input.value = "";
  } catch (error) {
    console.error("Send message failed:", error);
    showToast("Message could not be sent.", "error");
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    input?.focus();
  }
}
