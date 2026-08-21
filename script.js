import "./auth.js";

import {
  loadUsers,
  filterUsers,
  clearUserState
} from "./users.js";

import {
  loadUnreadCounts,
  sendMessage,
  stopMessages
} from "./messages.js";

import {
  initCalls,
  cleanupStaleCalls
} from "./calls.js";

import {
  clearSelectedUser
} from "./firebase.js";

import { showToast } from "./utils.js";

const sidebar = document.getElementById("sidebar");
const chatArea = document.getElementById("chatArea");
const backBtn = document.getElementById("backBtn");
const searchInput = document.getElementById("searchInput");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

function closeChat() {
  clearSelectedUser();
  stopMessages();
  sidebar?.classList.remove("hide");
  chatArea?.classList.remove("active");
  document.getElementById("chatUserName").textContent = "Select User";
  document.getElementById("chatUserStatus").textContent = "";
}

backBtn?.addEventListener("click", closeChat);

searchInput?.addEventListener("input", () => {
  filterUsers(searchInput.value);
});

sendBtn?.addEventListener("click", sendMessage);

messageInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void sendMessage();
  }
});

window.addEventListener("ms-auth-ready", async (event) => {
  const { user, profile } = event.detail;

  if (!user || !profile?.username) {
    clearUserState();
    closeChat();
    return;
  }

  await loadUsers();
  loadUnreadCounts();
  void cleanupStaleCalls();
});

window.addEventListener("ms-profile-ready", async (event) => {
  if (!event.detail?.user || !event.detail?.profile) return;

  await loadUsers();
  loadUnreadCounts();
});

window.addEventListener("selected-user-changed", () => {
  document.getElementById("messageInput")?.focus();
});

initCalls();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js", {
        scope: "./"
      });
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  });
}

window.addEventListener("error", (event) => {
  console.error("Unhandled application error:", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

if (window.location.protocol === "http:" && window.location.hostname !== "localhost") {
  showToast("Use HTTPS for microphone, camera and PWA features.", "error");
}
