'use client';

import { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { UserData, Goal } from '@/lib/types';
import { useUser as useFirebaseAuthUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { doc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface UserContextType {
    user: UserData | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    logout: () => void;
    saveUserData: (uid: string, data: Partial<Omit<UserData, 'goal' | 'detailsLastUpdatedAt' | 'email'>>) => Promise<void>;
    saveGoal: (goal: Goal, setTimestamp: boolean) => Promise<void>;
    username: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { user, isLoading, isLoggedIn } = useFirebaseAuthUser();
    const { firestore, auth } = useFirebase();
    const router = useRouter();
    const pathname = usePathname();

    const username = user?.name || (auth.currentUser ? auth.currentUser.email : null);

    const logout = useCallback(async () => {
        if (auth) {
            await signOut(auth);
            // Redirect to home after sign-out to ensure clean state
            router.push('/');
        }
    }, [auth, router]);

    const saveUserData = useCallback(async (uid: string, data: Partial<Omit<UserData, 'goal' | 'detailsLastUpdatedAt'>>) => {
        if (firestore) {
            const userRef = doc(firestore, 'users', uid);
            const dataToSave: Partial<UserData> = { ...data };

            return setDoc(userRef, dataToSave, { merge: true }).catch((error) => {
                const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'write',
                    requestResourceData: dataToSave,
                });
                errorEmitter.emit('permission-error', permissionError);
                throw error;
            });
        } else {
            console.error("Firestore not available");
            throw new Error("Firestore not available");
        }
    }, [firestore]);

    const saveGoal = useCallback(async (goal: Goal, setTimestamp: boolean) => {
        const currentUser = auth.currentUser;
        if (currentUser?.uid && firestore) {
            const userRef = doc(firestore, 'users', currentUser.uid);
            const dataToUpdate: Partial<UserData> = { goal };
            if (setTimestamp) {
                dataToUpdate.detailsLastUpdatedAt = new Date().toISOString();
            }

            return setDoc(userRef, dataToUpdate, { merge: true }).catch((error) => {
                const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'update',
                    requestResourceData: dataToUpdate,
                });
                errorEmitter.emit('permission-error', permissionError);
                throw error;
            });
        } else {
            console.error("User not logged in or firestore not available");
            throw new Error("User not logged in or firestore not available");
        }
    }, [auth, firestore]);

    useEffect(() => {
        if (isLoading) {
            return; // Wait until loading is complete
        }

        const publicRoutes = ['/', '/checkout', '/registro', '/status', '/terms', '/privacy'];
        const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

        if (isLoggedIn) {
            // User is logged in.
            // The 'user' object from useFirebaseAuthUser now returns a partial object even if the doc doesn't exist.
            const hasDetails = user?.age && user?.heightCm && user?.weightKg && user?.sex && user?.activityLevel;
            const hasGoal = !!user?.goal;

            if (hasDetails && hasGoal) {
                if (pathname !== '/plan') router.push('/plan');
            } else if (hasDetails && !hasGoal) {
                if (pathname !== '/goal') router.push('/goal');
            } else {
                // This covers new users (doc doesn't exist yet) and users who haven't filled details.
                if (pathname !== '/details') router.push('/details');
            }
        } else {
            // User is not logged in, redirect to home if not on a public route
            if (!isPublicRoute) {
                router.push('/');
            }
        }
    }, [isLoading, isLoggedIn, user, pathname, router]);

    const value = {
        user,
        isLoading,
        isLoggedIn,
        logout,
        saveUserData,
        saveGoal,
        username,
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
