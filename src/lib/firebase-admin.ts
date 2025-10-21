// IMPORTANT: This file is used on the SERVER-SIDE only.
// It uses the Firebase Admin SDK to connect to Firestore.

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;

// In the App Hosting environment, the SDK will automatically discover the
// service account credentials. When initializeApp() is called with no arguments,
// it uses GOOGLE_APPLICATION_CREDENTIALS environment variable.
// App Hosting automatically sets this variable.
if (!getApps().length) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

const adminDb = getFirestore(app);

export { adminDb };
