import "./auth.js";

import {
  loadUsers
} from "./users.js";

import {
  loadUnreadCounts
} from "./messages.js";

import {
  clearSelectedUser
} from "./firebase.js";

import "./presence.js";

// LOAD USERS

loadUsers();

// LOAD UNREADS

setTimeout(()=>{

  loadUnreadCounts();

},2000);

// MOBILE BACK BUTTON

const backBtn =
document.getElementById(
  "backBtn"
);

if(backBtn){

  backBtn.onclick = ()=>{

    // CLEAR ACTIVE CHAT

    clearSelectedUser();

    // SHOW SIDEBAR

    document
    .getElementById(
      "sidebar"
    )
    .classList.remove(
      "hide"
    );

    // HIDE CHAT

    document
    .getElementById(
      "chatArea"
    )
    .classList.remove(
      "active"
    );

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
