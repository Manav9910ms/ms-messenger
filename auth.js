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
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  ref,
  set,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

document.getElementById("loginBtn")
.onclick = async ()=>{

  await signInWithPopup(
    auth,
    provider
  );

};

document.getElementById("logoutBtn")
.onclick = async ()=>{

  const user = auth.currentUser;

  if(user){

    const statusRef =
    ref(
      realtimeDb,
      "status/" + user.uid
    );

    await set(statusRef,{
      online:false,
      lastSeen:Date.now()
    });

  }

  await signOut(auth);

  alert("Logout Successfully");

  location.reload();

};

onAuthStateChanged(auth,
async(user)=>{

  if(user){

    setCurrentUser(user);

    document.getElementById(
      "profilePic"
    ).src = user.photoURL;

    document.getElementById(
      "profileName"
    ).innerText =
    user.displayName;

    document.getElementById(
      "loginBtn"
    ).style.display = "none";

    await setDoc(
      doc(db,"users",user.uid),
      {

        uid:user.uid,

        name:user.displayName,

        email:user.email,

        photo:user.photoURL

      }
    );

    const statusRef =
    ref(
      realtimeDb,
      "status/" + user.uid
    );

    await set(statusRef,{
      online:true,
      lastSeen:Date.now()
    });

    onDisconnect(statusRef).set({
      online:false,
      lastSeen:Date.now()
    });

  }

});
