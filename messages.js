import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
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
let activeReply = null;
let activeEditId = null;
const renderedMessages = new Map();
const messagesCollection = collection(db, "messages");

function getChatElement() {
  return document.getElementById("chatMessages");
}

function getInput() {
  return document.getElementById("messageInput");
}

function getActionMenu() {
  let menu = document.getElementById("messageActionMenu");
  if (menu) return menu;

  menu = document.createElement("div");
  menu.id = "messageActionMenu";
  menu.className = "messageActionMenu";
  menu.hidden = true;
  document.body.appendChild(menu);

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) closeActionMenu();
  });

  window.addEventListener("resize", closeActionMenu);
  window.addEventListener("scroll", closeActionMenu, true);

  return menu;
}

function closeActionMenu() {
  const menu = document.getElementById("messageActionMenu");
  if (!menu) return;
  menu.hidden = true;
  menu.replaceChildren();
}

function openActionMenu(message, anchor) {
  const menu = getActionMenu();
  menu.replaceChildren();

  const actions = [
    { label: "Reply", action: () => startReply(message) },
    { label: "Copy", action: () => copyMessage(message.text || "") }
  ];

  if (message.senderUid === currentUser?.uid) {
    actions.push(
      { label: "Edit", action: () => startEdit(message) },
      { label: "Delete", danger: true, action: () => deleteMessage(message) }
    );
  }

  actions.forEach(({ label, action, danger }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = danger ? "actionDanger" : "";
    button.addEventListener("click", () => {
      closeActionMenu();
      void action();
    });
    menu.appendChild(button);
  });

  const rect = anchor.getBoundingClientRect();
  menu.hidden = false;

  const width = 150;
  const left = Math.min(
    Math.max(8, rect.left),
    window.innerWidth - width - 8
  );
  const top = Math.min(
    Math.max(8, rect.bottom + 6),
    window.innerHeight - menu.offsetHeight - 8
  );

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function ensureReplyBar() {
  let bar = document.getElementById("replyPreview");
  if (bar) {
    const cancel = bar.querySelector(".replyCancel");
    if (cancel && !cancel.dataset.bound) {
      cancel.dataset.bound = "true";
      cancel.addEventListener("click", clearComposerMode);
    }
    return bar;
  }

  const form = document.getElementById("messageForm");
  if (!form) return null;

  bar = document.createElement("div");
  bar.id = "replyPreview";
  bar.className = "replyPreview";
  bar.hidden = true;

  const text = document.createElement("div");
  text.className = "replyPreviewText";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "replyCancel";
  cancel.dataset.bound = "true";
  cancel.setAttribute("aria-label", "Cancel reply");
  cancel.textContent = "×";
  cancel.addEventListener("click", clearComposerMode);

  bar.append(text, cancel);
  form.parentElement?.insertBefore(bar, form);

  return bar;
}

function updateComposerMode() {
  const input = getInput();
  const sendButton = document.getElementById("sendBtn");
  const bar = ensureReplyBar();

  if (!input || !sendButton || !bar) return;

  if (activeEditId) {
    input.value = renderedMessages.get(activeEditId)?.text || "";
    input.placeholder = "Edit message...";
    input.focus();
    sendButton.textContent = "Save";
    bar.hidden = true;
    return;
  }

  if (activeReply) {
    const text = bar.querySelector(".replyPreviewText");
    if (text) {
      text.textContent = `Replying to: ${activeReply.text}`;
    }
    bar.hidden = false;
    input.placeholder = "Write a reply...";
    sendButton.textContent = "Send";
    input.focus();
    return;
  }

  bar.hidden = true;
  input.placeholder = "Type message...";
  sendButton.textContent = "Send";
}

function clearComposerMode() {
  activeReply = null;
  activeEditId = null;
  const input = getInput();
  if (input) input.value = "";
  updateComposerMode();
}

function startReply(message) {
  if (!message?.id) return;
  activeEditId = null;
  activeReply = {
    messageId: message.id,
    senderUid: message.senderUid,
    senderName: message.senderUid === currentUser?.uid ? "You" : (selectedUser?.name || "User"),
    text: String(message.text || "").slice(0, 240)
  };
  updateComposerMode();
}

function startEdit(message) {
  if (message.senderUid !== currentUser?.uid) return;
  activeReply = null;
  activeEditId = message.id;
  updateComposerMode();
}

async function copyMessage(text) {
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showToast("Message copied.", "success");
  } catch (error) {
    console.error("Copy failed:", error);
    showToast("Unable to copy message.", "error");
  }
}

async function deleteMessage(message) {
  if (message.senderUid !== currentUser?.uid) return;

  const confirmed = window.confirm("Delete this message?");
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "messages", message.id));
    if (activeEditId === message.id) clearComposerMode();
    showToast("Message deleted.", "success");
  } catch (error) {
    console.error("Delete message failed:", error);
    showToast("Unable to delete message.", "error");
  }
}

function renderReplyQuote(data, container) {
  if (!data.replyTo?.text) return;

  const quote = document.createElement("div");
  quote.className = "messageReplyQuote";

  const label = document.createElement("div");
  label.className = "messageReplyLabel";
  label.textContent = data.replyTo.senderName || "Reply";

  const text = document.createElement("div");
  text.className = "messageReplyText";
  text.textContent = data.replyTo.text;

  quote.append(label, text);
  container.appendChild(quote);
}

function renderMessages() {
  const chat = getChatElement();
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
    div.dataset.messageId = data.id;
    div.tabIndex = 0;
    div.setAttribute("aria-label", "Message actions available");

    renderReplyQuote(data, div);

    const textDiv = document.createElement("div");
    textDiv.className = "messageText";
    textDiv.textContent = data.text || "";
    if (data.editedAt) {
      textDiv.append(" ");
      const edited = document.createElement("span");
      edited.className = "editedLabel";
      edited.textContent = "edited";
      textDiv.appendChild(edited);
    }

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

    div.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openActionMenu(data, div);
    });

    div.addEventListener("click", (event) => {
      if (event.detail === 2) {
        openActionMenu(data, div);
      }
    });

    div.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openActionMenu(data, div);
      }
    });

    chat.appendChild(div);
  }

  if (activeEditId || activeReply) updateComposerMode();
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

  showToast("Unable to load this chat.", "error");
}

export function loadMessages() {
  if (!currentUser || !selectedUser) return;

  unsubscribeChatA?.();
  unsubscribeChatB?.();
  unsubscribeChatA = null;
  unsubscribeChatB = null;
  renderedMessages.clear();
  clearComposerMode();

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
  clearComposerMode();
  closeActionMenu();
  getChatElement()?.replaceChildren();
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

  const input = getInput();
  const text = input?.value.trim();
  if (!text) return;

  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) sendBtn.disabled = true;

  try {
    if (activeEditId) {
      await updateDoc(doc(db, "messages", activeEditId), {
        text,
        editedAt: Date.now()
      });
      clearComposerMode();
      showToast("Message updated.", "success");
      return;
    }

    const payload = {
      senderUid: currentUser.uid,
      receiverUid: selectedUser.uid,
      text,
      time: Date.now(),
      seen: false
    };

    if (activeReply) {
      payload.replyTo = {
        messageId: activeReply.messageId,
        senderUid: activeReply.senderUid,
        senderName: activeReply.senderName,
        text: activeReply.text
      };
    }

    await addDoc(messagesCollection, payload);
    clearComposerMode();
  } catch (error) {
    console.error("Send message failed:", error);
    showToast("Message could not be sent.", "error");
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    input?.focus();
  }
}
