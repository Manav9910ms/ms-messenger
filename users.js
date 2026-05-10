import {
  db,
  currentUser,
  setSelectedUser
} from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  listenUserStatus,
  applyStatus
} from "./presence.js";

import {
  loadMessages
} from "./messages.js";

import {
  loadFollowStats
} from "./followers.js";

async function loadUsers(){

  const usersList =
  document.getElementById(
    "usersList"
  );

  usersList.innerHTML = "";

  const snapshot =
  await getDocs(
    collection(db,"users")
  );

  snapshot.forEach((docSnap)=>{

    const data =
    docSnap.data();

    if(
      currentUser &&
      data.email !== currentUser.email
    ){

      const div =
      document.createElement("div");

      div.className = "user";

      div.innerHTML = `

        <img src="${data.photo}">

        <div>

          <div>${data.name}</div>

          <div class="userEmail">
            @${data.username || "user"}
          </div>

          <div class="status"
               id="status-${data.uid}">
          </div>

        </div>

      `;

      const statusDiv =
      div.querySelector(".status");

      const statusRef =
      listenUserStatus(data.uid);

      applyStatus(
        statusRef,
        statusDiv
      );

      div.onclick = ()=>{

        if(window.innerWidth <= 768){

          document
          .getElementById("sidebar")
          .classList.add("hide");

          document
          .getElementById("chatArea")
          .classList.add("active");

        }

        setSelectedUser(data);

        document.getElementById(
          "chatUserName"
        ).innerText =
        data.name;

        const headerStatus =
        document.getElementById(
          "chatUserStatus"
        );

        applyStatus(
          statusRef,
          headerStatus
        );

        loadMessages();

        loadFollowStats();

      };

      usersList.appendChild(div);

    }

  });

}

setTimeout(loadUsers,2000);

export { loadUsers };
