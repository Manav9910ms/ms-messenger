importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);

firebase.initializeApp({

  apiKey: "AIzaSyB92P1v8_9hPLhgqN5YmUzUXF_IIuD7Al0",
  authDomain: "ms-messenger-sys.firebaseapp.com",
  projectId: "ms-messenger-sys",
  storageBucket: "ms-messenger-sys.firebasestorage.app",
  messagingSenderId: "761516646845",
  appId: "1:761516646845:web:a574e6677fcc9f826872d4"

});

const messaging =
firebase.messaging();

// BACKGROUND NOTIFICATION

messaging.onBackgroundMessage(
(payload)=>{

  self.registration
  .showNotification(

    payload.notification.title,

    {

      body:
      payload.notification.body,

      icon:"/icon-192.png",

      badge:"/icon-192.png"

    }

  );

});