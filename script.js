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

import { clearSelectedUser } from "./firebase.js";
import { showToast } from "./utils.js";

const sidebar = document.getElementById("sidebar");
const chatArea = document.getElementById("chatArea");
const backBtn = document.getElementById("backBtn");
const searchInput = document.getElementById("searchInput");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

function closeChat() {
  clearSelectedUser();
  stopMessages();
  sidebar?.classList.remove("hide");
  chatArea?.classList.remove("active");

  const chatName = document.getElementById("chatUserName");
  const chatStatus = document.getElementById("chatUserStatus");
  if (chatName) chatName.textContent = "Select User";
  if (chatStatus) chatStatus.textContent = "";
}

backBtn?.addEventListener("click", closeChat);

searchInput?.addEventListener("input", () => {
  filterUsers(searchInput.value);
});

messageForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  void sendMessage();
});

window.addEventListener("ms-auth-ready", async ({ detail }) => {
  const { user, profile } = detail || {};

  if (!user || !profile?.username) {
    clearUserState();
    closeChat();
    return;
  }

  await loadUsers();
  loadUnreadCounts();
  void cleanupStaleCalls();
});

window.addEventListener("ms-profile-ready", async ({ detail }) => {
  if (!detail?.user || !detail?.profile) return;

  await loadUsers();
  loadUnreadCounts();
});

window.addEventListener("selected-user-changed", () => {
  messageInput?.focus();
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
  showToast("HTTPS is required for microphone, camera and PWA features.", "error");
}
