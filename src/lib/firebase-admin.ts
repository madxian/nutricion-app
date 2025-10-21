// IMPORTANT: This file is used on the SERVER-SIDE only.
// It uses the Firebase Admin SDK to connect to Firestore.

import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// In the App Hosting environment, the SDK will automatically discover the
// service account credentials. In a local environment, you may need to set
// the GOOGLE_APPLICATION_CREDENTIALS environment variable.
if (!getApps().length) {
  initializeApp();
}

const adminDb = getFirestore();

export { adminDb };
