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

document.getElementById("sendBtn")
.onclick = async ()=>{

  if(!selectedUser) return;

  const text =
  document.getElementById(
    "messageInput"
  ).value;

  if(text === "") return;

  await addDoc(
    collection(db,"messages"),
    {

      sender:currentUser.uid,

      receiver:selectedUser.uid,

      text:text,

      time:Date.now(),

      seen:false

    }
  );

  document.getElementById(
    "messageInput"
  ).value = "";

};

// LOAD CHAT MESSAGES

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
      data.sender === currentUser.uid &&
      data.receiver === selectedUser.uid;

      const c2 =
      data.sender === selectedUser.uid &&
      data.receiver === currentUser.uid;

      if(c1 || c2){

        // MARK AS SEEN

        if(
          data.receiver === currentUser.uid &&
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
        document.createElement("div");

        div.className =
        "message " +
        (
          data.sender === currentUser.uid
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
          data.sender === currentUser.uid
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

    // RESET ALL BADGES

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
        data.receiver === currentUser.uid &&
        !data.seen
      ){

        if(
          !unreadCounts[data.sender]
        ){

          unreadCounts[
            data.sender
          ] = 0;

        }

        unreadCounts[
          data.sender
        ]++;

      }

    });

    // SHOW BADGES

    Object.keys(
      unreadCounts
    ).forEach((sender)=>{

      const badge =
      document.getElementById(
        "unread-" + sender
      );

      if(badge){

        badge.style.display =
        "flex";

        badge.innerText =
        unreadCounts[sender];

      }

    });

  });

}

export {
  loadMessages,
  loadUnreadCounts
};
