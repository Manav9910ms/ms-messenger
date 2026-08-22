# MS Connect Push Notifications

The repository now contains the complete web push flow:

- Browser permission + FCM token registration
- Per-user FCM token storage in `users/{uid}/fcmTokens`
- Foreground notification handling
- Background notification handling in `firebase-messaging-sw.js`
- Notification click opens MS Connect
- Invalid FCM tokens are cleaned automatically
- FCM tokens are removed when the user logs out
- A Firebase Cloud Function sends a push when a new message is created

## One-time Firebase deployment

The browser code is deployed with GitHub Pages, but the message notification sender runs as a Firebase Cloud Function. GitHub Pages does not deploy the `functions/` directory.

From a local checkout with the Firebase CLI authenticated to the `ms-messenger-sys` project, deploy the function and rules:

```bash
firebase deploy --only functions,firestore:rules
```

Then open MS Connect, sign in, and click **Enable Notifications** when prompted.

## Firebase Console checklist

Make sure Cloud Messaging is enabled for the Firebase project and that the web app is using the same Firebase configuration as `firebase-config.js`.

The app does not store a server key or admin credential in the browser. The Cloud Function uses Firebase Admin SDK on the server side to send notifications securely.
