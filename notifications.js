import {
  app,
  db,
  currentUser
} from "./firebase.js";

import {
  getMessaging,
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

import {
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const messaging =
getMessaging(app);

async function initNotifications(){

  const permission =
  await Notification
  .requestPermission();

  if(
    permission !== "granted"
  ){

    alert(
      "Notifications blocked"
    );

    return;

  }

  const token =
  await getToken(
    messaging,
    {

      vapidKey:
      "BCduMZuNz-g1NWXrHR2RGsUO3yCiLmUFANS4uQ1DMuWoFpeElXcoVRuNftJMyBXRLo1_iuKNfUV7v0E8ktRbk1k"

    }
  );

  console.log(
    "FCM TOKEN:",
    token
  );

  // SAVE TOKEN

  if(currentUser){

    await updateDoc(

      doc(
        db,
        "users",
        currentUser.uid
      ),

      {
        fcmToken:token
      }

    );

  }

}

// FOREGROUND NOTIFICATION



export {
  initNotifications
};