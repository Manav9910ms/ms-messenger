import "./auth.js";

import {
  loadUsers
} from "./users.js";

import {
  loadUnreadCounts
} from "./messages.js";

import "./presence.js";

if(
  Notification.permission !==
  "granted"
){

  Notification.requestPermission();

}

// LOAD USERS

loadUsers();

// LOAD UNREAD BADGES

setTimeout(()=>{

  loadUnreadCounts();

},2000);

// MOBILE BACK BUTTON

const backBtn =
document.getElementById("backBtn");

if(backBtn){

  backBtn.onclick = ()=>{

    document
    .getElementById("sidebar")
    .classList.remove("hide");

    document
    .getElementById("chatArea")
    .classList.remove("active");

  };

}

// SEARCH USERS

const searchInput =
document.getElementById(
  "searchInput"
);

searchInput.addEventListener(
  "input",
  ()=>{

    const value =
    searchInput.value
    .toLowerCase();

    const users =
    document.querySelectorAll(
      ".user"
    );

    users.forEach((user)=>{

      const text =
      user.innerText
      .toLowerCase();

      if(
        text.includes(value)
      ){

        user.style.display =
        "flex";

      }else{

        user.style.display =
        "none";

      }

    });

  }
);
