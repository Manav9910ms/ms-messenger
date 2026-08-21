import {
  auth,
  provider,
  db,
  realtimeDb,
  setCurrentUser
} from "./firebase.js";

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  ref,
  set,
  onDisconnect,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { showToast } from "./utils.js";

const usernamePage = document.getElementById("usernamePage");
const usernameInput = document.getElementById("usernameInput");
const saveUsernameBtn = document.getElementById("saveUsernameBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profilePic = document.getElementById("profilePic");
const profileName = document.getElementById("profileName");
const profileUsername = document.getElementById("profileUsername");

function setLoggedInUi(isLoggedIn) {
  loginBtn.style.display = isLoggedIn ? "none" : "block";
  logoutBtn.style.display = isLoggedIn ? "block" : "none";
}

function normalizeUsername(value) {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

function validateUsername(username) {
  if (username.length < 3 || username.length > 20) {
    return "Username must be 3–20 characters.";
  }

  if (!/^[a-z0-9._]+$/.test(username)) {
    return "Use only letters, numbers, dot (.) and underscore (_).";
  }

  return null;
}

function updateProfileUi(user, profile) {
  profilePic.src = user.photoURL || "favicon.png";
  profileName.textContent = user.displayName || "User";
  profileUsername.textContent = `@${profile?.username || "user"}`;
}

async function updatePresence(user, online) {
  const statusRef = ref(realtimeDb, `status/${user.uid}`);

  if (online) {
    await set(statusRef, {
      online: true,
      lastSeen: serverTimestamp()
    });

    onDisconnect(statusRef).set({
      online: false,
      lastSeen: serverTimestamp()
    });
    return;
  }

  await set(statusRef, {
    online: false,
    lastSeen: serverTimestamp()
  });
}

loginBtn.addEventListener("click", async () => {
  loginBtn.disabled = true;

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login failed:", error);
    showToast("Unable to sign in. Please try again.", "error");
  } finally {
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;

  try {
    if (auth.currentUser) {
      await updatePresence(auth.currentUser, false);
    }

    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
    showToast("Unable to log out. Please try again.", "error");
  } finally {
    logoutBtn.disabled = false;
  }
});

saveUsernameBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const username = normalizeUsername(usernameInput.value);
  const validationError = validateUsername(username);

  if (validationError) {
    showToast(validationError, "error");
    return;
  }

  saveUsernameBtn.disabled = true;

  try {
    const userRef = doc(db, "users", user.uid);
    const usernameRef = doc(db, "usernames", username);
    const profile = {
      uid: user.uid,
      name: user.displayName || "User",
      username,
      email: user.email || "",
      photo: user.photoURL || ""
    };

    await runTransaction(db, async (transaction) => {
      const existingUsername = await transaction.get(usernameRef);

      if (existingUsername.exists()) {
        throw new Error("USERNAME_TAKEN");
      }

      transaction.set(userRef, profile, { merge: true });
      transaction.create(usernameRef, { uid: user.uid });
    });

    await updatePresence(user, true);
    usernamePage.classList.remove("active");
    updateProfileUi(user, profile);
    showToast("Username created successfully.", "success");
    window.dispatchEvent(new CustomEvent("ms-profile-ready", {
      detail: { user, profile }
    }));
  } catch (error) {
    console.error("Username creation failed:", error);

    if (error.message === "USERNAME_TAKEN") {
      showToast("That username is already taken.", "error");
    } else {
      showToast("Unable to create username. Please try again.", "error");
    }
  } finally {
    saveUsernameBtn.disabled = false;
  }
});

onAuthStateChanged(auth, async (user) => {
  setCurrentUser(user);

  if (!user) {
    setLoggedInUi(false);
    profilePic.src = "favicon.png";
    profileName.textContent = "Guest";
    profileUsername.textContent = "@username";
    usernamePage.classList.remove("active");
    window.dispatchEvent(new CustomEvent("ms-auth-ready", {
      detail: { user: null, profile: null }
    }));
    return;
  }

  setLoggedInUi(true);

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const profile = userSnap.exists() ? userSnap.data() : null;

    if (!profile?.username) {
      usernamePage.classList.add("active");
      usernameInput.value = "";
      usernameInput.focus();

      window.dispatchEvent(new CustomEvent("ms-auth-ready", {
        detail: { user, profile: null }
      }));
      return;
    }

    updateProfileUi(user, profile);
    await updatePresence(user, true);

    window.dispatchEvent(new CustomEvent("ms-auth-ready", {
      detail: { user, profile }
    }));
  } catch (error) {
    console.error("Auth initialization failed:", error);
    showToast("Unable to load your account. Please refresh.", "error");
  }
});
