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
  updateDoc,
  doc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getDatabase,
  ref,
  set,
  onValue,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const realtimeDb = getDatabase(app);

const storage = getStorage(app);

const provider = new GoogleAuthProvider();

let currentUser = null;

let selectedUser = null;

/* LOGIN */

document.getElementById("loginBtn").onclick =
async ()=>{

  await signInWithPopup(auth,provider);

};

/* LOGOUT */

document.getElementById("logoutBtn").onclick =
async ()=>{

  if(currentUser){

    const statusRef =
    ref(
      realtimeDb,
      "status/" + currentUser.uid
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

/* AUTH */

onAuthStateChanged(auth,async(user)=>{

  if(user){

    currentUser = user;

    document.getElementById("profilePic").src =
    user.photoURL;

    document.getElementById("profileName").innerText =
    user.displayName;

    document.getElementById("loginBtn")
    .style.display = "none";

    await setDoc(doc(db,"users",user.uid),{

      uid:user.uid,

      name:user.displayName,

      email:user.email,

      photo:user.photoURL

    });

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

    loadUsers();

    listenTyping();

  }

});

/* FORMAT LAST SEEN */

function formatLastSeen(timestamp){

  if(!timestamp) return "";

  const date = new Date(timestamp);

  const now = new Date();

  const yesterday = new Date();

  yesterday.setDate(
    yesterday.getDate() - 1
  );

  const time =
  date.toLocaleTimeString([],{
    hour:'2-digit',
    minute:'2-digit'
  });

  if(
    date.toDateString() ===
    now.toDateString()
  ){

    return "Today " + time;

  }

  if(
    date.toDateString() ===
    yesterday.toDateString()
  ){

    return "Yesterday " + time;

  }

  return date.toLocaleDateString();

}

/* LOAD USERS */

async function loadUsers(){

  const usersList =
  document.getElementById("usersList");

  usersList.innerHTML = "";

  const snapshot =
  await getDocs(collection(db,"users"));

  snapshot.forEach((docSnap)=>{

    const data = docSnap.data();

    if(data.email !== currentUser.email){

      const div =
      document.createElement("div");

      div.className = "user";

      div.innerHTML = `

        <img src="${data.photo}">

        <div class="userInfo">

          <div>${data.name}</div>

          <div class="userEmail">
            ${data.email}
          </div>

          <div class="status"
               id="status-${data.uid}">

            ⚫ Offline

          </div>

        </div>

      `;

      const statusRef =
      ref(
        realtimeDb,
        "status/" + data.uid
      );

      onValue(statusRef,(snapshot)=>{

        const statusDiv =
        document.getElementById(
          "status-" + data.uid
        );

        if(!statusDiv) return;

        const status = snapshot.val();

        if(status && status.online){

          statusDiv.innerHTML =
          "🟢 Online";

        }else if(status){

          statusDiv.innerHTML =
          "⚫ " +
          formatLastSeen(
            status.lastSeen
          );

        }

      });

      div.onclick = ()=>{

        selectedUser = data;

        document.getElementById(
          "chatUserName"
        ).innerText =
        data.name;

        const headerStatus =
        document.getElementById(
          "chatUserStatus"
        );

        onValue(statusRef,(snapshot)=>{

          const status =
          snapshot.val();

          if(status && status.online){

            headerStatus.innerHTML =
            "🟢 Online";

          }else if(status){

            headerStatus.innerHTML =
            "⚫ Last seen " +
            formatLastSeen(
              status.lastSeen
            );

          }

        });

        loadMessages();

      };

      usersList.appendChild(div);

    }

  });

}

/* SEARCH USERS */

document.getElementById("searchInput")
.addEventListener("input",()=>{

  const value =
  document.getElementById(
    "searchInput"
  )
  .value
  .toLowerCase();

  const users =
  document.querySelectorAll(".user");

  users.forEach((user)=>{

    if(
      user.innerText
      .toLowerCase()
      .includes(value)
    ){

      user.style.display = "flex";

    }else{

      user.style.display = "none";

    }

  });

});

/* TYPING */

document.getElementById("messageInput")
.addEventListener("input",()=>{

  if(!selectedUser) return;

  const typingRef =
  ref(
    realtimeDb,
    "typing/" + selectedUser.uid
  );

  set(typingRef,{
    name:currentUser.displayName
  });

  setTimeout(()=>{

    set(typingRef,null);

  },1000);

});

/* LISTEN TYPING */

function listenTyping(){

  if(!currentUser) return;

  const typingRef =
  ref(
    realtimeDb,
    "typing/" + currentUser.uid
  );

  onValue(typingRef,(snapshot)=>{

    const data = snapshot.val();

    const typingIndicator =
    document.getElementById(
      "typingIndicator"
    );

    if(data){

      typingIndicator.innerHTML =
      data.name + " is typing...";

    }else{

      typingIndicator.innerHTML = "";

    }

  });

}

/* IMAGE BUTTON */

document.getElementById("imageBtn")
.onclick = ()=>{

  document.getElementById(
    "imageInput"
  ).click();

};

/* IMAGE SEND */

document.getElementById("imageInput")
.addEventListener("change",
async(event)=>{

  const file =
  event.target.files[0];

  if(!file || !selectedUser) return;

  const imageRef =
  storageRef(
    storage,
    "images/" + Date.now()
  );

  await uploadBytes(
    imageRef,
    file
  );

  const imageUrl =
  await getDownloadURL(imageRef);

  await addDoc(
    collection(db,"messages"),
    {

      sender:currentUser.email,

      receiver:selectedUser.email,

      image:imageUrl,

      time:Date.now(),

      seen:false

    }
  );

});

/* SEND MESSAGE */

document.getElementById("sendBtn").onclick =
async ()=>{

  if(!selectedUser) return;

  const text =
  document.getElementById(
    "messageInput"
  ).value;

  if(text === "") return;

  await addDoc(
    collection(db,"messages"),
    {

      sender:currentUser.email,

      receiver:selectedUser.email,

      text:text,

      time:Date.now(),

      seen:false

    }
  );

  document.getElementById(
    "messageInput"
  ).value = "";

};

/* LOAD MESSAGES */

function loadMessages(){

  const q = query(
    collection(db,"messages"),
    orderBy("time")
  );

  onSnapshot(q,(snapshot)=>{

    const chat =
    document.getElementById(
      "chatMessages"
    );

    chat.innerHTML = "";

    snapshot.forEach((docSnap)=>{

      const data =
      docSnap.data();

      const c1 =
      data.sender === currentUser.email &&
      data.receiver === selectedUser.email;

      const c2 =
      data.sender === selectedUser.email &&
      data.receiver === currentUser.email;

      if(c1 || c2){

        if(
          data.receiver === currentUser.email
          && !data.seen
        ){

          updateDoc(
            doc(
              db,
              "messages",
              docSnap.id
            ),
            {
              seen:true
            }
          );

        }

        const div =
        document.createElement("div");

        div.className =
        "message " +
        (
          data.sender === currentUser.email
          ? "me"
          : "other"
        );

        const date =
        new Date(data.time);

        const time =
        date.toLocaleTimeString([],{
          hour:'2-digit',
          minute:'2-digit'
        });

        let tick = "";

        if(
          data.sender === currentUser.email
        ){

          tick =
          data.seen
          ? "✓✓"
          : "✓";

        }

        div.innerHTML = `

          <div class="sender">
            ${data.sender}
          </div>

          <div>
            ${data.text || ""}
          </div>

          ${
            data.image
            ? `
            <img src="${data.image}">
            `
            : ""
          }

          <div class="time">

            ${time}

            <span class="tick">
              ${tick}
            </span>

          </div>

        `;

        chat.appendChild(div);

      }

    });

    chat.scrollTop =
    chat.scrollHeight;

  });

}
