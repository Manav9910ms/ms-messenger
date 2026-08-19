import {
  db,
  currentUser,
  selectedUser
} from "./firebase.js";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

let localStream = null;
let peerConnection = null;
let currentCallId = null;
let currentCallType = "voice";
let activeIncomingCallId = null;
let activeIncomingCallType = "voice";
let unsubscribeIncoming = null;
let unsubscribeCall = null;
let unsubscribeRemoteCandidates = null;

const voiceCallBtn = document.getElementById("voiceCallBtn");
const videoCallBtn = document.getElementById("videoCallBtn");
const endCallBtn = document.getElementById("endCallBtn");
const incomingCallModal = document.getElementById("incomingCallModal");
const incomingCallTitle = document.getElementById("incomingCallTitle");
const incomingCallText = document.getElementById("incomingCallText");
const acceptCallBtn = document.getElementById("acceptCallBtn");
const rejectCallBtn = document.getElementById("rejectCallBtn");
const remoteAudio = document.getElementById("remoteAudio");
const remoteVideo = document.getElementById("remoteVideo");
const localVideo = document.getElementById("localVideo");
const videoPanel = document.getElementById("videoPanel");

export function initVoiceCalls(){
  if(voiceCallBtn){
    voiceCallBtn.onclick = ()=> startCall("voice");
  }

  if(videoCallBtn){
    videoCallBtn.onclick = ()=> startCall("video");
  }

  if(endCallBtn){
    endCallBtn.onclick = endCurrentCall;
  }

  if(acceptCallBtn){
    acceptCallBtn.onclick = acceptIncomingCall;
  }

  if(rejectCallBtn){
    rejectCallBtn.onclick = rejectIncomingCall;
  }

  window.addEventListener("selected-user-changed",()=>{
    syncCallButtonState();
  });

  syncCallButtonState();
  waitForAuthAndListenIncoming();
}

function showCallError(message,error){
  if(error && error.code === "permission-denied"){
    alert("Call failed: Firestore rules are blocking calls collection access.");
    console.error("Firestore permission denied:",error);
    return;
  }
  console.error(message,error || "");
  alert(message);
}

function syncCallButtonState(){
  const isDisabled = !currentUser || !selectedUser || !!currentCallId;

  if(voiceCallBtn){
    voiceCallBtn.disabled = isDisabled;
  }

  if(videoCallBtn){
    videoCallBtn.disabled = isDisabled;
  }
}

function setCallControlsActive(isActive){
  if(voiceCallBtn){
    voiceCallBtn.style.display = isActive ? "none" : "block";
  }

  if(videoCallBtn){
    videoCallBtn.style.display = isActive ? "none" : "block";
  }

  if(endCallBtn){
    endCallBtn.style.display = isActive ? "block" : "none";
  }

  syncCallButtonState();
}

function setVideoPanelVisible(isVisible){
  if(!videoPanel){
    return;
  }

  videoPanel.classList.toggle("active",isVisible);
}

function waitForAuthAndListenIncoming(){
  const intervalId = setInterval(()=>{
    if(currentUser){
      clearInterval(intervalId);
      listenIncomingCalls();
    }
  },500);
}

function listenIncomingCalls(){
  if(!currentUser){
    return;
  }

  const q = query(
    collection(db,"calls"),
    where("toUid","==",currentUser.uid),
    where("status","==","ringing")
  );

  if(typeof unsubscribeIncoming === "function"){
    unsubscribeIncoming();
  }

  unsubscribeIncoming = onSnapshot(q,(snapshot)=>{
    if(currentCallId){
      return;
    }

    let latestCall = null;

    snapshot.forEach((docSnap)=>{
      const data = docSnap.data();
      if(!latestCall || (data.createdAt || 0) > (latestCall.createdAt || 0)){
        latestCall = { id: docSnap.id, ...data };
      }
    });

    if(latestCall){
      activeIncomingCallId = latestCall.id;
      activeIncomingCallType = latestCall.callType || "voice";
      incomingCallTitle.innerText =
      activeIncomingCallType === "video" ? "Incoming Video Call" : "Incoming Voice Call";
      incomingCallText.innerText =
      (latestCall.fromName || "User") + " is calling you";
      incomingCallModal.classList.add("active");
    }else{
      activeIncomingCallId = null;
      incomingCallModal.classList.remove("active");
    }
  });
}

async function ensureLocalStream(callType){
  if(
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ){
    throw new Error("Media devices are not supported in this browser.");
  }

  if(localStream){
    localStream.getTracks().forEach((track)=> track.stop());
    localStream = null;
  }

  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: callType === "video"
  });

  if(localVideo){
    localVideo.srcObject = callType === "video" ? localStream : null;
  }

  return localStream;
}

function createPeerConnection(callId,role){
  peerConnection = new RTCPeerConnection(rtcConfig);

  localStream.getTracks().forEach((track)=>{
    peerConnection.addTrack(track,localStream);
  });

  peerConnection.ontrack = (event)=>{
    const stream = event.streams[0];
    if(remoteAudio){
      remoteAudio.srcObject = stream;
    }
    if(remoteVideo && currentCallType === "video"){
      remoteVideo.srcObject = stream;
    }
  };

  const localCandidatesRef = collection(
    db,
    "calls",
    callId,
    role === "caller" ? "offerCandidates" : "answerCandidates"
  );

  peerConnection.onicecandidate = async (event)=>{
    if(event.candidate){
      await addDoc(localCandidatesRef,event.candidate.toJSON());
    }
  };

  const remoteCandidatesRef = collection(
    db,
    "calls",
    callId,
    role === "caller" ? "answerCandidates" : "offerCandidates"
  );

  if(typeof unsubscribeRemoteCandidates === "function"){
    unsubscribeRemoteCandidates();
  }

  unsubscribeRemoteCandidates = onSnapshot(remoteCandidatesRef,(snapshot)=>{
    snapshot.docChanges().forEach((change)=>{
      if(change.type === "added" && peerConnection){
        peerConnection
        .addIceCandidate(new RTCIceCandidate(change.doc.data()))
        .catch(()=>{});
      }
    });
  });
}

async function startCall(callType){
  if(!currentUser || !selectedUser || currentCallId){
    if(!selectedUser){
      showCallError("Please select a user before starting a call.");
    }
    return;
  }

  if(typeof RTCPeerConnection === "undefined"){
    showCallError("WebRTC is not supported in this browser.");
    return;
  }

  try{
    currentCallType = callType;
    await ensureLocalStream(callType);

    const callRef = await addDoc(collection(db,"calls"),{
      fromUid: currentUser.uid,
      toUid: selectedUser.uid,
      fromName: currentUser.displayName || "User",
      toName: selectedUser.name || "User",
      callType,
      status: "ringing",
      createdAt: Date.now()
    });

    currentCallId = callRef.id;
    setCallControlsActive(true);
    setVideoPanelVisible(callType === "video");

    createPeerConnection(currentCallId,"caller");

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await updateDoc(doc(db,"calls",currentCallId),{
      offer: {
        type: offer.type,
        sdp: offer.sdp
      }
    });

    subscribeToCallState("caller");
  }catch(error){
    showCallError(
      "Unable to start video/voice call. Please allow microphone/camera permission and try again.",
      error
    );
    cleanupCall();
  }
}

async function acceptIncomingCall(){
  if(!activeIncomingCallId || !currentUser || currentCallId){
    return;
  }

  try{
    const callDocRef = doc(db,"calls",activeIncomingCallId);
    const callSnap = await getDoc(callDocRef);

    if(!callSnap.exists()){
      incomingCallModal.classList.remove("active");
      activeIncomingCallId = null;
      return;
    }

    const callData = callSnap.data();
    if(!callData.offer){
      return;
    }

    currentCallType = callData.callType || "voice";
    await ensureLocalStream(currentCallType);

    currentCallId = activeIncomingCallId;
    activeIncomingCallId = null;
    incomingCallModal.classList.remove("active");

    setCallControlsActive(true);
    setVideoPanelVisible(currentCallType === "video");

    createPeerConnection(currentCallId,"callee");

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(callData.offer)
    );

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await updateDoc(callDocRef,{
      answer: {
        type: answer.type,
        sdp: answer.sdp
      },
      status: "ongoing",
      answeredAt: Date.now()
    });

    subscribeToCallState("callee");
  }catch(error){
    showCallError(
      "Unable to accept call. Please allow microphone/camera permission and try again.",
      error
    );
    cleanupCall();
  }
}

async function rejectIncomingCall(){
  if(!activeIncomingCallId){
    return;
  }

  try{
    await updateDoc(doc(db,"calls",activeIncomingCallId),{
      status: "rejected",
      endedAt: Date.now()
    });
  }catch(error){
    console.error("Reject call failed:",error);
  }

  activeIncomingCallId = null;
  incomingCallModal.classList.remove("active");
}

function subscribeToCallState(role){
  const callDocRef = doc(db,"calls",currentCallId);

  if(typeof unsubscribeCall === "function"){
    unsubscribeCall();
  }

  unsubscribeCall = onSnapshot(callDocRef,async (snapshot)=>{
    if(!snapshot.exists()){
      cleanupCall();
      return;
    }

    const data = snapshot.data();

    if(
      role === "caller" &&
      data.answer &&
      peerConnection &&
      !peerConnection.currentRemoteDescription
    ){
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );

      await updateDoc(callDocRef,{ status: "ongoing" });
    }

    if(data.status === "ended" || data.status === "rejected"){
      cleanupCall();
    }
  });
}

async function endCurrentCall(){
  if(!currentCallId){
    return;
  }

  try{
    await updateDoc(doc(db,"calls",currentCallId),{
      status: "ended",
      endedAt: Date.now()
    });
  }catch(error){
    console.error("End call failed:",error);
  }

  cleanupCall();
}

function cleanupCall(){
  if(peerConnection){
    peerConnection.close();
    peerConnection = null;
  }

  if(localStream){
    localStream.getTracks().forEach((track)=> track.stop());
    localStream = null;
  }

  if(remoteAudio){
    remoteAudio.srcObject = null;
  }

  if(remoteVideo){
    remoteVideo.srcObject = null;
  }

  if(localVideo){
    localVideo.srcObject = null;
  }

  if(typeof unsubscribeCall === "function"){
    unsubscribeCall();
    unsubscribeCall = null;
  }

  if(typeof unsubscribeRemoteCandidates === "function"){
    unsubscribeRemoteCandidates();
    unsubscribeRemoteCandidates = null;
  }

  currentCallId = null;
  currentCallType = "voice";
  incomingCallModal.classList.remove("active");
  setVideoPanelVisible(false);
  setCallControlsActive(false);
}

export async function cleanupStaleCalls(){
  if(!currentUser){
    return;
  }

  const q = query(
    collection(db,"calls"),
    where("status","==","ringing"),
    where("fromUid","==",currentUser.uid)
  );

  const snapshot = await getDocs(q);

  snapshot.forEach(async (docSnap)=>{
    const data = docSnap.data();
    if((Date.now() - (data.createdAt || 0)) > 120000){
      await updateDoc(doc(db,"calls",docSnap.id),{
        status: "ended",
        endedAt: Date.now()
      });
    }
  });
}
