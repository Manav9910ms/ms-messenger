import {
  loadUsers
} from "./users.js";

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

import {
  loadFollowStats
} from "./followers.js";

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

const profilePage =
document.getElementById(
  "profilePage"
);

const closeProfileBtn =
document.getElementById(
  "closeProfileBtn"
);

const profilePageImg =
document.getElementById(
  "profilePageImg"
);

const profilePageName =
document.getElementById(
  "profilePageName"
);

const profilePageEmail =
document.getElementById(
  "profilePageEmail"
);

document.getElementById(
  "loginBtn"
).onclick = async ()=>{

  await signInWithPopup(
    auth,
    provider
  );

};

document.getElementById(
  "logoutBtn"
).onclick = async ()=>{

  const user =
  auth.currentUser;

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

  alert(
    "Logout Successfully"
  );

  location.reload();

};

onAuthStateChanged(
auth,
async(user)=>{

  if(user){

    setCurrentUser(user);

    document.getElementById(
      "profilePic"
    ).src =
    user.photoURL;

    document.getElementById(
      "profileName"
    ).innerText =
    user.displayName;

    document.getElementById(
      "loginBtn"
    ).style.display =
    "none";

    document.getElementById(
      "logoutBtn"
    ).style.display =
    "block";

    document.getElementById(
      "myFollowers"
    ).innerText = "";

    document.getElementById(
      "myFollowing"
    ).innerText = "";

    const userRef =
    doc(
      db,
      "users",
      user.uid
    );

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
        username.replace(
          "@",
          ""
        );

        if(username.length < 3){

          alert(
            "Username too short"
          );

          return;

        }

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

        setTimeout(()=>{

          location.reload();

        },500);

      };

    }else{

      await setDoc(userRef,{

        ...userSnap.data(),

        name:user.displayName,

        email:user.email,

        photo:user.photoURL

      });

    }

    profilePageEmail.innerText =
    "@" +
    (
      userSnap.data()?.username
      || "user"
    );

    document.getElementById(
      "profilePic"
    ).onclick = ()=>{

      profilePage.classList.add(
        "active"
      );

      profilePageImg.src =
      user.photoURL;

      profilePageName.innerText =
      user.displayName;

      profilePageEmail.innerText =
      "@" +
      (
        userSnap.data()?.username
        || "user"
      );

    };

    const statusRef =
    ref(
      realtimeDb,
      "status/" + user.uid
    );

    await set(statusRef,{
      online:true,
      lastSeen:Date.now()
    });

    onDisconnect(
      statusRef
    ).set({
      online:false,
      lastSeen:Date.now()
    });

    loadFollowStats(

      user.uid,

      document.getElementById(
        "myFollowers"
      ),

      document.getElementById(
        "myFollowing"
      )

    );

    setTimeout(()=>{

      loadUsers();

    },500);

  }else{

    document.getElementById(
      "profileName"
    ).innerText =
    "Guest";

    document.getElementById(
      "profilePic"
    ).src = "";

    document.getElementById(
      "loginBtn"
    ).style.display =
    "block";

    document.getElementById(
      "logoutBtn"
    ).style.display =
    "none";

    document.getElementById(
      "myFollowers"
    ).innerText =
    "";

    document.getElementById(
      "myFollowing"
    ).innerText =
    "";

  }

});

closeProfileBtn.onclick =
()=>{

  profilePage.classList.remove(
    "active"
  );

};
