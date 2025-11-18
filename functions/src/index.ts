
import { https, logger } from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

function generateRegistrationCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 2; i++) code += digits.charAt(Math.floor(Math.random() * digits.length));
  return code.split("").sort(() => 0.5 - Math.random()).join("");
}

const WEBHOOK_VERSION = "v2-migrate-refs-2025-11-18";

export const wompiWebhook = https.onRequest((req, res) => {
    (async () => {
        logger.info(`wompiWebhook ${WEBHOOK_VERSION} - request received`, { headers: req.headers });

        try {
            const WOMPI_EVENT_SECRET = process.env.WOMPI_EVENT_SECRET || '';
            if (!WOMPI_EVENT_SECRET) {
                logger.error("Missing WOMPI_EVENT_SECRET");
                res.status(500).json({ error: "Server config error" });
                return;
            }

            const event = req.body || {};
            const receivedChecksum = event.signature?.checksum;
            const eventTimestamp = event.timestamp;
            const tx = event.data?.transaction;

            if (!receivedChecksum || !eventTimestamp || !tx || !tx.id) {
                logger.warn("Request is missing signature, timestamp, transaction data, or transaction ID.", {
                    hasChecksum: !!receivedChecksum,
                    hasTimestamp: !!eventTimestamp,
                    hasTransaction: !!tx,
                    hasTxId: !!tx?.id,
                });
                res.status(400).json({ error: "Missing signature, timestamp, or transaction info" });
                return;
            }

            // --- Checksum logic kept exactly as before ---
            const concatenatedProperties = `${tx.id}${tx.status}${tx.amount_in_cents}`;
            const stringToSign = `${concatenatedProperties}${eventTimestamp}${WOMPI_EVENT_SECRET}`;
            const computedChecksum = crypto.createHash("sha256")
                .update(stringToSign)
                .digest("hex");

            if (computedChecksum !== receivedChecksum) {
                logger.warn("Invalid checksum.", {
                    received: receivedChecksum,
                    computed: computedChecksum,
                    stringToSign: stringToSign.replace(WOMPI_EVENT_SECRET, '***SECRET***')
                });
                res.status(403).json({ error: "Invalid checksum." });
                return;
            }

            const txId = String(tx.id);
            const referenceId = tx.reference || null;
            logger.info("Checksum verified. Processing event for transaction ID:", txId, { reference: referenceId, webhookVersion: WEBHOOK_VERSION });

            // --- NEW: try to find an existing doc created with a random ID that already contains this transactionId
            let paymentRefDocRef: FirebaseFirestore.DocumentReference;
            let existingDocId: string | null = null;

            try {
                const existingQuery = db.collection("payment_references")
                                        .where("transactionId", "==", txId)
                                        .limit(1);
                const existingSnap = await existingQuery.get();

                if (!existingSnap.empty) {
                    // Update the existing document (random ID) so we don't have duplicates
                    paymentRefDocRef = existingSnap.docs[0].ref;
                    existingDocId = existingSnap.docs[0].id;
                    logger.info("Found existing payment_references doc (random ID). Will update it.", { existingDocId });
                } else {
                    // No existing doc: create deterministic doc using txId as ID
                    paymentRefDocRef = db.collection("payment_references").doc(txId);
                    logger.info("No existing doc found. Will create/update deterministic payment_references doc with txId as ID.", { targetDocId: txId });
                }
            } catch (qErr) {
                // If the query fails for any reason, fallback to deterministic doc
                logger.error("Error while searching for existing payment_references by transactionId; falling back to deterministic doc", { err: qErr });
                paymentRefDocRef = db.collection("payment_references").doc(txId);
            }

            // Base payload for payment_references (always include status)
            const basePayload: any = {
                transactionId: txId,
                status: String(tx.status || 'UNKNOWN').toUpperCase(),
                reference: referenceId,
                amount_in_cents: Number(tx.amount_in_cents ?? tx.amount ?? 0),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                rawEvent: event
            };

            if (String(tx.status).toUpperCase() === 'APPROVED') {
                const registrationCode = generateRegistrationCode();

                // Save code doc (unchanged)
                const codeDocRef = db.collection("payment_codes").doc(String(registrationCode));
                await codeDocRef.set({
                    status: 'APPROVED',
                    registrationCode,
                    transactionId: txId,
                    reference: referenceId,
                    used: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    rawEvent: event
                });

                // Ensure payment_references doc includes registrationCode and APPROVED status
                await paymentRefDocRef.set({
                    ...basePayload,
                    registrationCode,
                    status: 'APPROVED'
                }, { merge: true });

                logger.info(`Payment ${txId} approved. Generated code: ${registrationCode}`, { targetDocId: paymentRefDocRef.id, existingDocId });
            } else {
                // For any other status (DECLINED, PENDING, UNKNOWN) update/create the payment_references doc
                await paymentRefDocRef.set({
                    ...basePayload
                }, { merge: true });

                logger.info(`Payment ${txId} has status: ${String(tx.status || 'UNKNOWN')}`, { targetDocId: paymentRefDocRef.id, existingDocId });
            }

            res.status(200).json({ received: true, docId: paymentRefDocRef.id });

        } catch (err) {
            logger.error('Unexpected error in wompiWebhook:', err);
            res.status(500).json({ error: "Internal error" });
        }
    })();
});

export const registerWithCode = https.onCall(async (data, context) => {
  // Basic validation
  const email = ((data?.email || '') as string).toString().trim().toLowerCase();
  const password = ((data?.password || '') as string).toString();
  const rawCode = ((data?.registrationCode || '') as string).toString();
  const rawReferralCode = ((data?.referralCode || '') as string).toString().trim().toUpperCase();

  // Sanitize codes
  const registrationCode = rawCode.normalize('NFKC').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const referralCode = rawReferralCode.normalize('NFKC').replace(/[^A-Za-z0-9]/g, '').toUpperCase();


  if (!email || !password || !registrationCode) {
    throw new https.HttpsError('invalid-argument', 'Email, password y registrationCode son requeridos.');
  }

  const codeRef = db.collection('payment_codes').doc(registrationCode);

  // 1) Pre-read to give clear messages
  const codeSnap = await codeRef.get();
  if (!codeSnap.exists) {
    throw new https.HttpsError('not-found', 'Código no encontrado.');
  }
  const codeData = codeSnap.data() as any;
  if (codeData?.used === true) {
    throw new https.HttpsError('already-exists', 'Código ya fue usado.');
  }
  if (String(codeData?.status).toUpperCase() !== 'APPROVED') {
    throw new https.HttpsError('failed-precondition', `Código no aprobado (status: ${codeData?.status}).`);
  }

  // 2) Create user in Auth (Admin SDK)
  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
    });
    logger.info('User created (admin)', { uid: userRecord.uid, email });
  } catch (err: any) {
    logger.error('Failed to create user via admin.auth().createUser', { err });
    if (err?.code === 'auth/email-already-exists') {
      throw new https.HttpsError('already-exists', 'El correo ya está registrado.');
    }
    throw new https.HttpsError('internal', 'No se pudo crear el usuario.');
  }

  // 3) Transaction: re-check code, mark used, create user doc, and handle referral
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(codeRef);
      if (!snap.exists) {
        throw new https.HttpsError('not-found', 'Código no encontrado (transacción).');
      }
      const current = snap.data() as any;
      if (current?.used === true) {
        throw new https.HttpsError('already-exists', 'Código ya fue utilizado (concurrency).');
      }

      // Mark as used
      tx.update(codeRef, {
        used: true,
        usedBy: userRecord.uid,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create user doc
      const userDocRef = db.collection('users').doc(userRecord.uid);
      tx.set(userDocRef, {
        email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Handle referral code if provided
      if (referralCode) {
        // **FIX**: Get transactionId from the document read *inside* the transaction
        const transactionId = current.transactionId;
        const referredUserRef = db.collection('referred_codes').doc(referralCode).collection('referred_users').doc(userRecord.uid);
        tx.set(referredUserRef, {
          email: email,
          transactionId: transactionId, // Use the ID from within the transaction
          registeredAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  } catch (txErr: any) {
    logger.error('Transaction failed; cleaning up created user', { txErr, uid: userRecord.uid });
    // Cleanup: delete created user to avoid orphans
    try {
      await admin.auth().deleteUser(userRecord.uid);
      logger.info('Deleted created user after tx failure', { uid: userRecord.uid });
    } catch (cleanupErr) {
      logger.error('Failed to delete user after tx failure', { cleanupErr, uid: userRecord.uid });
    }

    if (txErr instanceof https.HttpsError) {
      throw txErr;
    }
    throw new https.HttpsError('aborted', 'No se pudo consumir el código. Intenta de nuevo.');
  }

  // 4) Generate and return custom token
  try {
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    return { customToken };
  } catch (err: any) {
    logger.error('Failed to create customToken', { err, uid: userRecord.uid });
    throw new https.HttpsError('internal', 'No se pudo generar el token de autenticación.');
  }
});
