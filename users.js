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

    // SKIP SELF

    if(
      currentUser &&
      data.uid !== currentUser.uid
    ){

      const div =
      document.createElement(
        "div"
      );

      div.className = "user";

      div.innerHTML = `

        <img src="${data.photo}">

        <div class="userInfo">

          <div>
            ${data.name}
          </div>

          <div class="userEmail">
            @${data.username || "user"}
          </div>

          <div class="status"
               id="status-${data.uid}">
          </div>

        </div>

        <div class="unreadBadge"
             id="unread-${data.uid}">
        </div>

      `;

      const statusDiv =
      div.querySelector(
        ".status"
      );

      const statusRef =
      listenUserStatus(
        data.uid
      );

      applyStatus(
        statusRef,
        statusDiv
      );

      div.onclick = ()=>{

        // MOBILE CHAT OPEN

        if(
          window.innerWidth <= 768
        ){

          document
          .getElementById(
            "sidebar"
          )
          .classList.add(
            "hide"
          );

          document
          .getElementById(
            "chatArea"
          )
          .classList.add(
            "active"
          );

        }

        // SELECT USER

        setSelectedUser(data);

        document
        .getElementById(
          "chatUserName"
        )
        .innerText =
        data.name;

        const headerStatus =
        document
        .getElementById(
          "chatUserStatus"
        );

        applyStatus(
          statusRef,
          headerStatus
        );

        // HIDE UNREAD BADGE

        const badge =
        document
        .getElementById(

          "unread-" +
          data.uid

        );

        if(badge){

          badge.style.display =
          "none";

        }

        // LOAD CHAT

        loadMessages();

      };

      usersList.appendChild(
        div
      );

    }

  });

}

setTimeout(
  loadUsers,
  2000
);

export {
  loadUsers
};
