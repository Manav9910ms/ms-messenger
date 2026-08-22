const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

exports.sendMessageNotification = onDocumentCreated(
  "messages/{messageId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const message = snapshot.data();
    const receiverUid = message.receiverUid;
    const senderUid = message.senderUid;
    const text = String(message.text || "").trim();

    if (!receiverUid || !senderUid || !text || receiverUid === senderUid) {
      return;
    }

    const senderSnap = await db.doc(`users/${senderUid}`).get();
    const sender = senderSnap.exists ? senderSnap.data() : null;
    const senderName = sender?.name || message.senderUsername || "Someone";

    const tokensSnap = await db.collection(`users/${receiverUid}/fcmTokens`).get();
    const tokens = tokensSnap.docs
      .map((tokenDoc) => ({ id: tokenDoc.id, token: tokenDoc.get("token") }))
      .filter((item) => typeof item.token === "string" && item.token.length > 0);

    if (!tokens.length) return;

    const response = await messaging.sendEachForMulticast({
      tokens: tokens.map((item) => item.token),
      notification: {
        title: `New message from ${senderName}`,
        body: text.length > 120 ? `${text.slice(0, 117)}…` : text
      },
      data: {
        senderUid,
        senderName,
        messageId: snapshot.id,
        body: text.length > 500 ? `${text.slice(0, 497)}…` : text
      }
    });

    const cleanup = [];
    response.responses.forEach((result, index) => {
      if (result.success) return;

      const code = result.error?.code || "";
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        cleanup.push(
          db.doc(`users/${receiverUid}/fcmTokens/${tokens[index].id}`).delete()
        );
      }
    });

    await Promise.allSettled(cleanup);
  }
);
