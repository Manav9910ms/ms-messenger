import {
  db,
  currentUser,
  selectedUser
} from "./firebase.js";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const followBtn =
document.getElementById(
  "followBtn"
);

async function toggleFollow(){

  if(
    !currentUser ||
    !selectedUser
  ) return;

  const q = query(
    collection(db,"followers"),
    where(
      "followerId",
      "==",
      currentUser.uid
    ),
    where(
      "followingId",
      "==",
      selectedUser.uid
    )
  );

  const snap =
  await getDocs(q);

  if(snap.empty){

    await addDoc(
      collection(db,"followers"),
      {
        followerId:
        currentUser.uid,

        followingId:
        selectedUser.uid,

        time:Date.now()
      }
    );

  }else{

    snap.forEach(async(d)=>{

      await deleteDoc(
        doc(
          db,
          "followers",
          d.id
        )
      );

    });

  }

}

function loadFollowStats(){

  if(!selectedUser) return;

  const followersQuery =
  query(
    collection(db,"followers"),
    where(
      "followingId",
      "==",
      selectedUser.uid
    )
  );

  const followingQuery =
  query(
    collection(db,"followers"),
    where(
      "followerId",
      "==",
      selectedUser.uid
    )
  );

  onSnapshot(
    followersQuery,
    (snap)=>{

      document.getElementById(
        "followersCount"
      ).innerText =
      snap.size +
      " Followers";

    }
  );

  onSnapshot(
    followingQuery,
    (snap)=>{

      document.getElementById(
        "followingCount"
      ).innerText =
      snap.size +
      " Following";

    }
  );

}

followBtn.onclick =
toggleFollow;

export {
  loadFollowStats
};
