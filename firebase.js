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

// CURRENT USER

export let currentUser = null;

// SELECTED CHAT USER

export let selectedUser = null;

// SET CURRENT USER

export function setCurrentUser(user){

  currentUser = user;

}

// SET SELECTED USER

export function setSelectedUser(user){

  selectedUser = user;

}

// CLEAR SELECTED USER

export function clearSelectedUser(){

  selectedUser = null;

}
