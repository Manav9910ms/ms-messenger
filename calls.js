import {
  db,
  currentUser,
  selectedUser
} from "./firebase.js";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { showToast } from "./utils.js";

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ],
  iceCandidatePoolSize: 10
};

let localStream = null;
let peerConnection = null;
let currentCallId = null;
let currentCallType = "voice";
let incomingCallId = null;
let unsubscribeIncoming = null;
let unsubscribeCall = null;
let unsubscribeRemoteCandidates = null;
let ringingTimeout = null;

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

function syncButtons() {
  const disabled = !currentUser || !selectedUser || !!currentCallId;
  if (voiceCallBtn) voiceCallBtn.disabled = disabled;
  if (videoCallBtn) videoCallBtn.disabled = disabled;
}

function setCallControls(active) {
  if (voiceCallBtn) voiceCallBtn.style.display = active ? "none" : "block";
  if (videoCallBtn) videoCallBtn.style.display = active ? "none" : "block";
  if (endCallBtn) endCallBtn.style.display = active ? "block" : "none";
  syncButtons();
}

function setVideoPanel(active) {
  videoPanel?.classList.toggle("active", active);
}

function getCallParticipant(callData) {
  if (!currentUser) return false;
  return callData?.fromUid === currentUser.uid || callData?.toUid === currentUser.uid;
}

async function ensureLocalStream(callType) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("MEDIA_UNSUPPORTED");
  }

  localStream?.getTracks().forEach((track) => track.stop());
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: callType === "video"
  });

  if (localVideo) {
    localVideo.srcObject = callType === "video" ? localStream : null;
  }

  return localStream;
}

function createPeerConnection(callId, role) {
  peerConnection = new RTCPeerConnection(rtcConfig);

  localStream?.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    const stream = event.streams[0];
    if (remoteAudio) remoteAudio.srcObject = stream;
    if (remoteVideo && currentCallType === "video") {
      remoteVideo.srcObject = stream;
    }
  };

  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection?.connectionState;
    if (state === "failed" || state === "closed") {
      void endCurrentCall(false);
    }
  };

  const localCandidates = collection(
    db,
    "calls",
    callId,
    role === "caller" ? "offerCandidates" : "answerCandidates"
  );

  peerConnection.onicecandidate = async (event) => {
    if (!event.candidate) return;
    try {
      await addDoc(localCandidates, event.candidate.toJSON());
    } catch (error) {
      console.error("ICE candidate write failed:", error);
    }
  };

  const remoteCandidates = collection(
    db,
    "calls",
    callId,
    role === "caller" ? "answerCandidates" : "offerCandidates"
  );

  unsubscribeRemoteCandidates?.();
  unsubscribeRemoteCandidates = onSnapshot(remoteCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added" || !peerConnection) return;
      peerConnection.addIceCandidate(
        new RTCIceCandidate(change.doc.data())
      ).catch((error) => {
        console.error("ICE candidate failed:", error);
      });
    });
  });
}

async function startCall(callType) {
  if (!currentUser || !selectedUser || currentCallId) return;

  if (typeof RTCPeerConnection === "undefined") {
    showToast("This browser does not support calls.", "error");
    return;
  }

  try {
    currentCallType = callType;
    await ensureLocalStream(callType);

    const callRef = await addDoc(collection(db, "calls"), {
      fromUid: currentUser.uid,
      toUid: selectedUser.uid,
      fromName: currentUser.displayName || "User",
      toName: selectedUser.name || "User",
      callType,
      status: "ringing",
      createdAt: Date.now()
    });

    currentCallId = callRef.id;
    setCallControls(true);
    setVideoPanel(callType === "video");

    createPeerConnection(currentCallId, "caller");

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await updateDoc(callRef, {
      offer: {
        type: offer.type,
        sdp: offer.sdp
      }
    });

    subscribeToCall(currentCallId, "caller");

    ringingTimeout = setTimeout(() => {
      if (currentCallId === callRef.id) {
        void endCurrentCall(true);
      }
    }, 30000);
  } catch (error) {
    console.error("Start call failed:", error);
    showToast(
      error.message === "MEDIA_UNSUPPORTED"
        ? "Calls are not supported in this browser."
        : "Unable to start the call. Check microphone/camera permission.",
      "error"
    );
    cleanupCall();
  }
}

async function acceptIncomingCall() {
  if (!incomingCallId || !currentUser || currentCallId) return;

  try {
    const callId = incomingCallId;
    const callRef = doc(db, "calls", callId);
    const callSnap = await getDoc(callRef);

    if (!callSnap.exists()) {
      closeIncomingModal();
      return;
    }

    const callData = callSnap.data();
    if (!getCallParticipant(callData) || callData.toUid !== currentUser.uid) {
      closeIncomingModal();
      return;
    }

    if (callData.status !== "ringing" || !callData.offer) {
      closeIncomingModal();
      return;
    }

    currentCallType = callData.callType === "video" ? "video" : "voice";
    await ensureLocalStream(currentCallType);

    currentCallId = callId;
    closeIncomingModal();
    setCallControls(true);
    setVideoPanel(currentCallType === "video");

    createPeerConnection(currentCallId, "callee");
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(callData.offer)
    );

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await updateDoc(callRef, {
      answer: {
        type: answer.type,
        sdp: answer.sdp
      },
      status: "ongoing",
      answeredAt: Date.now()
    });

    subscribeToCall(currentCallId, "callee");
  } catch (error) {
    console.error("Accept call failed:", error);
    showToast("Unable to accept the call.", "error");
    cleanupCall();
  }
}

async function rejectIncomingCall() {
  if (!incomingCallId) return;

  const id = incomingCallId;
  try {
    const callRef = doc(db, "calls", id);
    const callSnap = await getDoc(callRef);

    if (callSnap.exists() && getCallParticipant(callSnap.data())) {
      await updateDoc(callRef, {
        status: "rejected",
        endedAt: Date.now()
      });
    }
  } catch (error) {
    console.error("Reject call failed:", error);
  } finally {
    closeIncomingModal();
  }
}

function closeIncomingModal() {
  incomingCallId = null;
  incomingCallModal?.classList.remove("active");
}

function subscribeToCall(callId, role) {
  unsubscribeCall?.();

  const callRef = doc(db, "calls", callId);
  unsubscribeCall = onSnapshot(callRef, async (snapshot) => {
    if (!snapshot.exists()) {
      cleanupCall();
      return;
    }

    const data = snapshot.data();

    if (!getCallParticipant(data)) {
      cleanupCall();
      return;
    }

    if (
      role === "caller" &&
      data.answer &&
      peerConnection &&
      !peerConnection.currentRemoteDescription
    ) {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );

      if (data.status === "ringing") {
        await updateDoc(callRef, { status: "ongoing" });
      }
    }

    if (["ended", "rejected", "missed"].includes(data.status)) {
      cleanupCall();
    }
  }, (error) => {
    console.error("Call listener failed:", error);
    cleanupCall();
  });
}

async function endCurrentCall(writeState = true) {
  const callId = currentCallId;
  if (!callId) {
    cleanupCall();
    return;
  }

  if (writeState) {
    try {
      const callRef = doc(db, "calls", callId);
      const callSnap = await getDoc(callRef);
      if (callSnap.exists() && getCallParticipant(callSnap.data())) {
        await updateDoc(callRef, {
          status: "ended",
          endedAt: Date.now()
        });
      }
    } catch (error) {
      console.error("End call failed:", error);
    }
  }

  cleanupCall();
}

function cleanupCall() {
  if (ringingTimeout) {
    clearTimeout(ringingTimeout);
    ringingTimeout = null;
  }

  peerConnection?.close();
  peerConnection = null;

  localStream?.getTracks().forEach((track) => track.stop());
  localStream = null;

  if (remoteAudio) remoteAudio.srcObject = null;
  if (remoteVideo) remoteVideo.srcObject = null;
  if (localVideo) localVideo.srcObject = null;

  unsubscribeCall?.();
  unsubscribeRemoteCandidates?.();
  unsubscribeCall = null;
  unsubscribeRemoteCandidates = null;

  currentCallId = null;
  currentCallType = "voice";
  setVideoPanel(false);
  setCallControls(false);
}

function listenIncomingCalls() {
  unsubscribeIncoming?.();
  if (!currentUser) return;

  const incomingQuery = query(
    collection(db, "calls"),
    where("toUid", "==", currentUser.uid),
    where("status", "==", "ringing")
  );

  unsubscribeIncoming = onSnapshot(incomingQuery, (snapshot) => {
    if (currentCallId) return;

    let latest = null;
    snapshot.forEach((callDoc) => {
      const data = callDoc.data();
      if (!latest || (data.createdAt || 0) > (latest.createdAt || 0)) {
        latest = { id: callDoc.id, ...data };
      }
    });

    if (!latest) {
      closeIncomingModal();
      return;
    }

    incomingCallId = latest.id;
    incomingCallTitle.textContent =
      latest.callType === "video" ? "Incoming Video Call" : "Incoming Voice Call";
    incomingCallText.textContent = `${latest.fromName || "User"} is calling you`;
    incomingCallModal?.classList.add("active");
  }, (error) => {
    console.error("Incoming calls listener failed:", error);
  });
}

export function initCalls() {
  voiceCallBtn?.addEventListener("click", () => void startCall("voice"));
  videoCallBtn?.addEventListener("click", () => void startCall("video"));
  endCallBtn?.addEventListener("click", () => void endCurrentCall(true));
  acceptCallBtn?.addEventListener("click", () => void acceptIncomingCall());
  rejectCallBtn?.addEventListener("click", () => void rejectIncomingCall());

  window.addEventListener("ms-auth-ready", ({ detail }) => {
    if (detail?.user) {
      listenIncomingCalls();
      syncButtons();
    } else {
      unsubscribeIncoming?.();
      unsubscribeIncoming = null;
      cleanupCall();
      closeIncomingModal();
    }
  });

  window.addEventListener("selected-user-changed", syncButtons);
  syncButtons();
}

export async function cleanupStaleCalls() {
  if (!currentUser) return;

  try {
    const staleQuery = query(
      collection(db, "calls"),
      where("fromUid", "==", currentUser.uid),
      where("status", "==", "ringing")
    );

    const snapshot = await getDocs(staleQuery);
    const cutoff = Date.now() - 120000;

    const updates = [];
    snapshot.forEach((callDoc) => {
      const data = callDoc.data();
      if ((data.createdAt || 0) < cutoff) {
        updates.push(
          updateDoc(doc(db, "calls", callDoc.id), {
            status: "missed",
            endedAt: Date.now()
          })
        );
      }
    });

    await Promise.allSettled(updates);
  } catch (error) {
    console.error("Stale call cleanup failed:", error);
  }
}
