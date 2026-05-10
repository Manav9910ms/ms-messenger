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
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  ref,
  set,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const usernamePage =
document.getElementById(
  "usernamePage"
);

const usernameInput =
document.getElementById(
  "usernameInput"
);

const saveUsernameBtn =
document.getElementById(
  "saveUsernameBtn"
);

document.getElementById("loginBtn")
.onclick = async ()=>{

  await signInWithPopup(
    auth,
    provider
  );

  location.reload();

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

onAuthStateChanged(
auth,
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

    const userRef =
    doc(db,"users",user.uid);

    const userSnap =
    await getDoc(userRef);

    if(!userSnap.exists()){

      usernamePage.classList.add(
        "active"
      );

      saveUsernameBtn.onclick =
      async ()=>{

        let username =
        usernameInput.value
        .trim()
        .toLowerCase();

        username =
        username.replace("@","");

        if(username.length < 3){

          alert(
            "Username too short"
          );

          return;

        }

        console.log(
          "Saving username..."
        );

        await setDoc(userRef,{

          uid:user.uid,

          name:user.displayName,

          username:username,

          email:user.email,

          photo:user.photoURL

        });

        usernamePage.classList.remove(
          "active"
        );

        location.reload();

      };

    }else{

      await setDoc(userRef,{

        ...userSnap.data(),

        name:user.displayName,

        email:user.email,

        photo:user.photoURL

      });

    }

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
