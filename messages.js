import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  db,
  currentUser,
  selectedUser
} from "./firebase.js";

import { showToast } from "./utils.js";

let unsubscribeChatA = null;
let unsubscribeChatB = null;
let unsubscribeUnread = null;
const renderedMessages = new Map();
const messagesCollection = collection(db, "messages");

function renderMessages() {
  const chat = document.getElementById("chatMessages");
  if (!chat || !currentUser || !selectedUser) return;

  const wasNearBottom =
    chat.scrollHeight - chat.scrollTop - chat.clientHeight < 120;

  const messages = [...renderedMessages.entries()]
    .map(([id, data]) => ({ id, ...data }))
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

    const receipt = data.senderUid === currentUser.uid
      ? (data.seen ? " ✓✓" : " ✓")
      : "";

    timeDiv.textContent = `${time}${receipt}`;
    div.append(textDiv, timeDiv);
    chat.appendChild(div);
  }

  if (wasNearBottom) chat.scrollTop = chat.scrollHeight;
}

async function markIncomingMessagesSeen(snapshot) {
  if (!currentUser || !selectedUser) return;

  const unseenIds = [];
  snapshot.forEach((messageDoc) => {
    const data = messageDoc.data();
    if (
      data.receiverUid === currentUser.uid &&
      data.senderUid === selectedUser.uid &&
      !data.seen
    ) {
      unseenIds.push(messageDoc.id);
    }
  });

  if (!unseenIds.length) return;

  try {
    const batch = writeBatch(db);
    unseenIds.forEach((id) => {
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
      renderedMessages.delete(change.doc.id);
      return;
    }

    renderedMessages.set(change.doc.id, change.doc.data());
  });

  renderMessages();
  void markIncomingMessagesSeen(snapshot);
}

function handleListenerError(label, error) {
  console.error(`${label} listener failed:`, error);

  if (error?.code === "permission-denied") {
    showToast("Chat access was denied by Firebase rules.", "error");
    return;
  }

  if (error?.code === "failed-precondition") {
    showToast("Chat needs a Firebase index deployment.", "error");
    return;
  }

  showToast("Unable to load this chat.", "error");
}

export function loadMessages() {
  if (!currentUser || !selectedUser) return;

  unsubscribeChatA?.();
  unsubscribeChatB?.();
  unsubscribeChatA = null;
  unsubscribeChatB = null;
  renderedMessages.clear();

  // Deliberately omit orderBy so chats work from GitHub Pages even when
  // Firebase composite indexes have not yet been deployed. Messages are
  // sorted locally after the two participant-specific queries return.
  const sentQuery = query(
    messagesCollection,
    where("senderUid", "==", currentUser.uid),
    where("receiverUid", "==", selectedUser.uid)
  );

  const receivedQuery = query(
    messagesCollection,
    where("senderUid", "==", selectedUser.uid),
    where("receiverUid", "==", currentUser.uid)
  );

  unsubscribeChatA = onSnapshot(
    sentQuery,
    handleChatSnapshot,
    (error) => handleListenerError("Sent messages", error)
  );

  unsubscribeChatB = onSnapshot(
    receivedQuery,
    handleChatSnapshot,
    (error) => handleListenerError("Received messages", error)
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
  document.getElementById("chatMessages")?.replaceChildren();
}

export function loadUnreadCounts() {
  unsubscribeUnread?.();
  unsubscribeUnread = null;

  if (!currentUser) return;

  document.querySelectorAll(".unreadBadge").forEach((badge) => {
    badge.style.display = "none";
    badge.textContent = "";
  });

  const unreadQuery = query(
    messagesCollection,
    where("receiverUid", "==", currentUser.uid),
    where("seen", "==", false)
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
        counts.set(data.senderUid, (counts.get(data.senderUid) || 0) + 1);
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
    await addDoc(messagesCollection, {
      senderUid: currentUser.uid,
      receiverUid: selectedUser.uid,
      text,
      time: Date.now(),
      seen: false
    });

    if (input) input.value = "";
  } catch (error) {
    console.error("Send message failed:", error);
    showToast("Message could not be sent.", "error");
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    input?.focus();
  }
}
