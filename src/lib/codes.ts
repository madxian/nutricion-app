'use server';

import { adminDb } from '@/lib/firebase-admin';
import { collection, query, where, getDocs, limit, updateDoc, doc, writeBatch } from 'firebase/firestore';

// THIS IMPLEMENTATION NOW USES THE ADMIN FIRESTORE INSTANCE.

interface Code {
    id?: string; // Document ID in Firestore
    code: string;
    used: boolean;
    transactionId: string | null;
    assignedTo: string | null; // e.g., user email or username
}

const codesCollection = collection(adminDb, 'registrationCodes');

/**
 * Assigns the first available code to a transaction.
 * This is called by the PayU webhook.
 */
export async function assignCodeToTransaction(transactionId: string, userEmail: string): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
        // Find the first unused code
        const q = query(codesCollection, where('used', '==', false), where('transactionId', '==', null), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error('CRITICAL: No available registration codes in Firestore.');
            return { success: false, error: 'No available codes.' };
        }

        const codeDoc = querySnapshot.docs[0];
        const codeToAssign = codeDoc.data() as Code;
        
        // Assign the code to the transaction
        await updateDoc(doc(adminDb, 'registrationCodes', codeDoc.id), {
            transactionId: transactionId,
            assignedTo: userEmail, // Associate with the buyer's email for reference
        });
        
        console.log(`Code ${codeToAssign.code} assigned to transaction ${transactionId}`);
        return { success: true, code: codeToAssign.code };

    } catch (error) {
        console.error("Error assigning code from Firestore: ", error);
        return { success: false, error: 'Failed to assign code from database.' };
    }
}

/**
 * Validates a code and marks it as used upon successful user registration.
 */
export async function validateAndUseCode(code: string, username: string): Promise<{ success: boolean; error?: string }> {
    try {
        const q = query(codesCollection, where('code', '==', code), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: 'El código no es válido.' };
        }

        const codeDoc = querySnapshot.docs[0];
        const codeData = codeDoc.data() as Code;

        if (codeData.used) {
            return { success: false, error: 'Este código ya ha sido utilizado.' };
        }

        if (!codeData.transactionId) {
             return { success: false, error: 'Este código no ha sido asignado a un pago válido.' };
        }

        // Mark the code as used and assign to the new username
        await updateDoc(doc(adminDb, 'registrationCodes', codeDoc.id), {
            used: true,
            assignedTo: username, // Overwrite email with final username
        });
        
        console.log(`Code ${code} successfully validated and used by ${username}.`);
        return { success: true };

    } catch (error) {
        console.error("Error validating code in Firestore: ", error);
        return { success: false, error: 'Error interno del servidor al validar el código.' };
    }
}

/**
 * Utility function to add codes to Firestore. Run this once to populate.
 * Not part of the main application flow.
 */
export async function addCodesBatch(codes: string[]) {
    const batch = writeBatch(adminDb);
    
    codes.forEach(codeValue => {
        const newCodeRef = doc(codesCollection);
        batch.set(newCodeRef, {
            code: codeValue,
            used: false,
            transactionId: null,
            assignedTo: null,
        });
    });

    await batch.commit();
    console.log(`${codes.length} codes have been added to Firestore.`);
}
