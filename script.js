import { firebaseConfig } from "./firebase-config.js";

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  setDoc,
  doc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const provider = new GoogleAuthProvider();

let currentUser = null;

let selectedUser = null;

/* LOGIN */

document.getElementById("loginBtn").onclick = async () => {

  await signInWithPopup(auth, provider);

};

/* LOGOUT */

document.getElementById("logoutBtn").onclick = async () => {

  await signOut(auth);

};

/* AUTH STATE */

onAuthStateChanged(auth, async (user) => {

  if(user){

    currentUser = user;

    document.getElementById("profilePic").src =
      user.photoURL;

    document.getElementById("profileName").innerText =
      user.displayName;

    /* SAVE USER */

    await setDoc(doc(db, "users", user.uid), {

      name: user.displayName,

      email: user.email,

      photo: user.photoURL

    });

    loadUsers();

  }

});

/* LOAD USERS */

async function loadUsers(){

  const usersList = document.getElementById("usersList");

  usersList.innerHTML = "";

  const snapshot = await getDocs(collection(db, "users"));

  snapshot.forEach((docSnap) => {

    const data = docSnap.data();

    if(data.email !== currentUser.email){

      const div = document.createElement("div");

      div.className = "user";

      div.innerText = data.name;

      div.onclick = () => {

        selectedUser = data;

        document.getElementById("chatHeader").innerText =
          data.name;

        loadMessages();

      };

      usersList.appendChild(div);

    }

  });

}

/* SEND MESSAGE */

document.getElementById("sendBtn").onclick =
async () => {

  if(!selectedUser) return;

  const text =
    document.getElementById("messageInput").value;

  if(text === "") return;

  await addDoc(collection(db, "messages"), {

    sender: currentUser.email,

    receiver: selectedUser.email,

    text: text,

    time: Date.now()

  });

  document.getElementById("messageInput").value = "";

};

/* LOAD MESSAGES */

function loadMessages(){

  const q = query(
    collection(db, "messages"),
    orderBy("time")
  );

  onSnapshot(q, (snapshot) => {

    const chat =
      document.getElementById("chatMessages");

    chat.innerHTML = "";

    snapshot.forEach((docSnap) => {

      const data = docSnap.data();

      const condition1 =
        data.sender === currentUser.email &&
        data.receiver === selectedUser.email;

      const condition2 =
        data.sender === selectedUser.email &&
        data.receiver === currentUser.email;

      if(condition1 || condition2){

        const div = document.createElement("div");

        div.className =
          "message " +
          (data.sender === currentUser.email
            ? "me"
            : "other");

        div.innerHTML = `
          <div class="sender">
            ${data.sender}
          </div>

          ${data.text}
        `;

        chat.appendChild(div);

      }

    });

    chat.scrollTop = chat.scrollHeight;

  });

}
