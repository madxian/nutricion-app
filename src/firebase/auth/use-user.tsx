'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase/provider';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import type { UserData } from '@/lib/types';

interface UseUserResult {
  user: UserData | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}

export function useUser(): UseUserResult {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoading(true); // Set loading to true whenever auth state changes
      setFirebaseUser(user);
      if (!user) {
        // If user is logged out, we are done loading and there is no user data.
        setUser(null);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (firebaseUser) {
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      const unsubscribe = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as UserData);
          } else {
            // Document doesn't exist. This happens right after sign-up.
            // Create a partial user object so the app knows the user is logged in
            // but needs to complete their profile.
            setUser({
              name: firebaseUser.displayName || '',
              email: firebaseUser.email || '',
            } as UserData); // Cast as UserData, even though it's partial
          }
          setIsLoading(false);
        },
        (error) => {
          console.error("Error fetching user data:", error);
          setUser(null);
          setIsLoading(false);
        }
      );
      return () => unsubscribe();
    } else {
        // No firebase user, not logged in.
        setUser(null);
        setIsLoading(false);
    }
  }, [firebaseUser, firestore]);

  return {
    user,
    isLoading,
    isLoggedIn: !!firebaseUser,
  };
}
