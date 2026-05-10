import {
  realtimeDb
} from "./firebase.js";

import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  formatLastSeen
} from "./utils.js";

export function listenUserStatus(uid){

  const statusRef =
  ref(
    realtimeDb,
    "status/" + uid
  );

  return statusRef;

}

export function applyStatus(
  statusRef,
  element
){

  onValue(statusRef,(snapshot)=>{

    const status =
    snapshot.val();

    if(status && status.online){

      element.innerHTML =
      "🟢 Online";

    }else if(status){

      element.innerHTML =
      "⚫ " +
      formatLastSeen(
        status.lastSeen
      );

    }

  });

}
