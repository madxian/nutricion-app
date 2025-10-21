'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import type { UserData } from './types';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

const usersCollection = 'users';

const createUserInFirestore = async (uid: string, username: string) => {
    const userRef = doc(db, usersCollection, uid);
    const userData: Partial<UserData> = {
        name: username, // Initially, we can use the username as the name
    };
    await setDoc(userRef, userData, { merge: true });
};

export { app, db, auth, usersCollection, createUserInFirestore, createUserWithEmailAndPassword, signInWithEmailAndPassword };
