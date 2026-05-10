import { firebaseConfig }
from "./firebase-config.js";

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export const app =
initializeApp(firebaseConfig);

export const auth =
getAuth(app);

export const db =
getFirestore(app);

export const realtimeDb =
getDatabase(app);

export const provider =
new GoogleAuthProvider();

export let currentUser = null;

export let selectedUser = null;

export function setCurrentUser(user){

  currentUser = user;

}

export function setSelectedUser(user){

  selectedUser = user;

}
