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

document.getElementById(
  "logoutBtn"
).style.display = "none";

// LOGIN

document.getElementById("loginBtn")
.onclick = async ()=>{

  await signInWithPopup(
    auth,
    provider
  );

  location.reload();

};

// LOGOUT

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

// AUTH STATE

onAuthStateChanged(
auth,
async(user)=>{

  if(user){

    setCurrentUser(user);

    document.getElementById(
      "loginBtn"
    ).style.display = "none";

    document.getElementById(
      "logoutBtn"
    ).style.display = "block";

    const userRef =
    doc(
      db,
      "users",
      user.uid
    );

    const userSnap =
    await getDoc(userRef);

    // NEW USER OR NO USERNAME

    if(
      !userSnap.exists() ||
      !userSnap.data().username
    ){

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

        username =
        username.replace(/\s+/g,'');

        if(username.length < 3){

          alert(
            "Username too short"
          );

          return;

        }

        // CHECK USERNAME EXISTS

        const usernameRef =
        doc(
          db,
          "usernames",
          username
        );

        const usernameSnap =
        await getDoc(
          usernameRef
        );

        if(usernameSnap.exists()){

          alert(
            "Username already taken"
          );

          return;

        }

        // SAVE USER

        await setDoc(userRef,{

          uid:user.uid,

          name:user.displayName,

          username:username,

          email:user.email,

          photo:user.photoURL

        });

        // RESERVE USERNAME

        await setDoc(
          usernameRef,
          {
            uid:user.uid
          }
        );

        alert(
          "Username created successfully"
        );

        usernamePage.classList.remove(
          "active"
        );

        location.reload();

      };

      return;

    }else{

      // UPDATE EXISTING USER

      await setDoc(userRef,{

        ...userSnap.data(),

        name:user.displayName,

        email:user.email,

        photo:user.photoURL

      });

    }

    // PROFILE UI

    document.getElementById(
      "profilePic"
    ).src = user.photoURL;

    document.getElementById(
      "profileName"
    ).innerText =
    user.displayName;

    document.getElementById(
      "profileUsername"
    ).innerText =
    "@" + (
      userSnap.data().username ||
      "user"
    );

    // ONLINE STATUS

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

  }else{

    document.getElementById(
      "loginBtn"
    ).style.display = "block";

    document.getElementById(
      "logoutBtn"
    ).style.display = "none";

  }

});
