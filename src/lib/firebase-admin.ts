// IMPORTANT: This file is used on the SERVER-SIDE only.
// It uses the Firebase Admin SDK to connect to Firestore.

import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// App Hosting provides a service account automatically.
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'base64').toString('utf8'))
  : undefined;

if (!getApps().length) {
  initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined,
  });
}

const adminDb = getFirestore(getApp());

export { adminDb };
