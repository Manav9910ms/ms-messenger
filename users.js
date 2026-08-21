import {
  db,
  currentUser,
  setSelectedUser,
  clearSelectedUser
} from "./firebase.js";

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { applyStatus } from "./presence.js";
import { loadMessages, stopMessages } from "./messages.js";
import { showToast } from "./utils.js";

let statusUnsubscribers = [];
let cachedUsers = [];

function cleanupStatusListeners() {
  statusUnsubscribers.forEach((unsubscribe) => unsubscribe?.());
  statusUnsubscribers = [];
}

function createUserElement(data) {
  const div = document.createElement("div");
  div.className = "user";
  div.tabIndex = 0;
  div.dataset.search = `${data.name || ""} ${data.username || ""}`.toLowerCase();

  const img = document.createElement("img");
  img.alt = `${data.name || "User"} profile picture`;
  img.src = data.photo || "favicon.png";
  img.loading = "lazy";
  img.decoding = "async";

  const info = document.createElement("div");
  info.className = "userInfo";

  const name = document.createElement("div");
  name.textContent = data.name || "User";

  const username = document.createElement("div");
  username.className = "userUsername";
  username.textContent = `@${data.username || "user"}`;

  const status = document.createElement("div");
  status.className = "status";
  status.id = `status-${data.uid}`;

  info.append(name, username, status);

  const unread = document.createElement("div");
  unread.className = "unreadBadge";
  unread.id = `unread-${data.uid}`;
  unread.setAttribute("aria-label", "Unread messages");

  div.append(img, info, unread);
  statusUnsubscribers.push(applyStatus(data.uid, status));

  const selectUser = () => {
    setSelectedUser(data);

    const chatName = document.getElementById("chatUserName");
    const chatStatus = document.getElementById("chatUserStatus");
    if (chatName) chatName.textContent = data.name || "User";
    if (chatStatus) chatStatus.id = `chat-status-${data.uid}`;

    const badge = document.getElementById(`unread-${data.uid}`);
    if (badge) {
      badge.style.display = "none";
      badge.textContent = "";
    }

    if (window.innerWidth <= 768) {
      document.getElementById("sidebar")?.classList.add("hide");
      document.getElementById("chatArea")?.classList.add("active");
    }

    window.dispatchEvent(new CustomEvent("selected-user-changed", {
      detail: data
    }));

    loadMessages();
  };

  div.addEventListener("click", selectUser);
  div.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectUser();
    }
  });

  return div;
}

export async function loadUsers() {
  const usersList = document.getElementById("usersList");
  if (!usersList || !currentUser) return;

  cleanupStatusListeners();
  cachedUsers = [];
  usersList.replaceChildren();

  try {
    const usersQuery = query(
      collection(db, "users"),
      orderBy("username", "asc"),
      limit(100)
    );

    const snapshot = await getDocs(usersQuery);

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.uid && data.uid !== currentUser.uid && data.username) {
        cachedUsers.push(data);
      }
    });

    const fragment = document.createDocumentFragment();
    cachedUsers.forEach((user) => fragment.appendChild(createUserElement(user)));
    usersList.appendChild(fragment);
  } catch (error) {
    console.error("User loading failed:", error);
    showToast("Unable to load users. Please refresh.", "error");
  }
}

export function filterUsers(value) {
  const search = value.trim().toLowerCase();

  document.querySelectorAll(".user").forEach((user) => {
    user.style.display =
      !search || user.dataset.search.includes(search)
        ? "flex"
        : "none";
  });
}

export function clearUserState() {
  cleanupStatusListeners();
  cachedUsers = [];
  clearSelectedUser();
  stopMessages();
}
