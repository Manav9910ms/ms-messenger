# MS Connect authentication setup

For Google Sign-In on GitHub Pages, add the deployed host to Firebase Authentication > Settings > Authorized domains:

- `manav9910ms.github.io`
- `localhost` (for local development)

The Google provider must also be enabled under Firebase Authentication > Sign-in method.

The app uses Firebase `signInWithPopup()` first and falls back to `signInWithRedirect()` when the browser blocks the popup.
