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

      sender:currentUser.email,

      receiver:selectedUser.email,

      text:text,

      time:Date.now(),

      seen:false

    }
  );

  document.getElementById(
    "messageInput"
  ).value = "";

};

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
      data.sender === currentUser.email &&
      data.receiver === selectedUser.email;

      const c2 =
      data.sender === selectedUser.email &&
      data.receiver === currentUser.email;

      if(c1 || c2){

        if(
          data.receiver === currentUser.email
          && !data.seen
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
          data.sender === currentUser.email
          ? "me"
          : "other"
        );

        const date =
        new Date(data.time);

        const time =
        date.toLocaleTimeString([],{
          hour:'2-digit',
          minute:'2-digit'
        });

        let tick = "";

        if(
          data.sender === currentUser.email
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

export { loadMessages };
