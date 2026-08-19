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
  if(!currentUser){
    return;
  }

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

      const img =
      document.createElement("img");
      img.alt = "User";
      if(typeof data.photo === "string"){
        img.src = data.photo;
      }

      const info =
      document.createElement("div");
      info.className = "userInfo";

      const nameDiv =
      document.createElement("div");
      nameDiv.innerText =
      data.name || "User";

      const usernameDiv =
      document.createElement("div");
      usernameDiv.className = "userEmail";
      usernameDiv.innerText =
      "@" + (data.username || "user");

      const statusDiv =
      document.createElement("div");
      statusDiv.className = "status";
      statusDiv.id = "status-" + data.uid;

      info.appendChild(nameDiv);
      info.appendChild(usernameDiv);
      info.appendChild(statusDiv);

      const unreadDiv =
      document.createElement("div");
      unreadDiv.className =
      "unreadBadge";
      unreadDiv.id =
      "unread-" + data.uid;

      div.appendChild(img);
      div.appendChild(info);
      div.appendChild(unreadDiv);

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
        window.dispatchEvent(
          new CustomEvent(
            "selected-user-changed",
            {
              detail: data
            }
          )
        );

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

export {
  loadUsers
};
