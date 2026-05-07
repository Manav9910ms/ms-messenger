import { firebaseConfig } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

window.signup = async function () {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try{
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Account Created!");
  }
  catch(error){
    alert(error.message);
  }

}

window.login = async function () {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try{
    await signInWithEmailAndPassword(auth, email, password);
    alert("Login Success!");
  }
  catch(error){
    alert(error.message);
  }

}

window.logout = async function () {

  await signOut(auth);

  alert("Logged Out");

}

window.sendMessage = async function () {

  const user = auth.currentUser;

  if(!user){
    alert("Login First");
    return;
  }

  const message = document.getElementById("message").value;

  if(message === ""){
    return;
  }

  await addDoc(collection(db, "messages"), {
    text: message,
    sender: user.email,
    time: Date.now()
  });

  document.getElementById("message").value = "";

}

const q = query(collection(db, "messages"), orderBy("time"));

onSnapshot(q, (snapshot) => {

  const chat = document.getElementById("chat");

  chat.innerHTML = "";

  snapshot.forEach((doc) => {

    const data = doc.data();

    chat.innerHTML += `
      <div class="message">
        <b>${data.sender}</b><br>
        ${data.text}
      </div>
    `;

  });

});
