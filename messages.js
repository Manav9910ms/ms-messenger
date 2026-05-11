import {
  db,
  currentUser,
  selectedUser
} from "./firebase.js";

import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// SEND MESSAGE

document.getElementById(
  "sendBtn"
).onclick = async ()=>{

  if(!selectedUser) return;

  const input =
  document.getElementById(
    "messageInput"
  );

  const text =
  input.value.trim();

  if(text === "") return;

  await addDoc(
    collection(db,"messages"),
    {

      senderUid:
      currentUser.uid,

      receiverUid:
      selectedUser.uid,

      senderUsername:
      document.getElementById(
        "profileUsername"
      ).innerText,

      text:text,

      time:Date.now(),

      seen:false

    }
  );

  input.value = "";

};

// LOAD CHAT

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
      data.senderUid ===
      currentUser.uid &&

      data.receiverUid ===
      selectedUser.uid;

      const c2 =
      data.senderUid ===
      selectedUser.uid &&

      data.receiverUid ===
      currentUser.uid;

      if(c1 || c2){

        // MARK AS SEEN

        if(
          data.receiverUid ===
          currentUser.uid &&

          !data.seen
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
        document.createElement(
          "div"
        );

        div.className =
        "message " +

        (
          data.senderUid ===
          currentUser.uid

          ? "me"

          : "other"
        );

        const date =
        new Date(data.time);

        const time =
        date.toLocaleTimeString([],{

          hour:"2-digit",

          minute:"2-digit"

        });

        let tick = "";

        if(
          data.senderUid ===
          currentUser.uid
        ){

          tick =
          data.seen
          ? "✓✓"
          : "✓";

        }

        div.innerHTML = `

          <div>
            ${data.text}
          </div>

          <div class="time">
            ${time} ${tick}
          </div>

        `;

        chat.appendChild(div);

      }

    });

    chat.scrollTop =
    chat.scrollHeight;

  });

}

// LOAD UNREAD COUNTS

function loadUnreadCounts(){

  const q = query(
    collection(db,"messages"),
    orderBy("time")
  );

  onSnapshot(q,(snapshot)=>{

    // RESET BADGES

    document
    .querySelectorAll(
      ".unreadBadge"
    )
    .forEach((badge)=>{

      badge.style.display =
      "none";

    });

    const unreadCounts = {};

    snapshot.forEach((docSnap)=>{

      const data =
      docSnap.data();

      if(

        data.receiverUid ===
        currentUser.uid &&

        !data.seen

      ){

        if(
          !unreadCounts[
            data.senderUid
          ]
        ){

          unreadCounts[
            data.senderUid
          ] = 0;

        }

        unreadCounts[
          data.senderUid
        ]++;

      }

    });

    // SHOW BADGES

    Object.keys(
      unreadCounts
    ).forEach((senderUid)=>{

      const badge =
      document.getElementById(

        "unread-" +
        senderUid

      );

      if(badge){

        badge.style.display =
        "flex";

        badge.innerText =
        unreadCounts[
          senderUid
        ];

      }

    });

  });

}

export {

  loadMessages,

  loadUnreadCounts

};
