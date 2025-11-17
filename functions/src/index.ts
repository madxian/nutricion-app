
import { https, logger } from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

// Initialize Firebase Admin SDK (idempotent)
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

/**
 * Generates a simple, semi-unique registration code.
 * Example: "AB12CD"
 */
function generateRegistrationCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  // 4 letters + 2 digits, then shuffle
  let code = "";
  for (let i = 0; i < 4; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 2; i++) code += digits.charAt(Math.floor(Math.random() * digits.length));
  return code.split("").sort(() => 0.5 - Math.random()).join("");
}

export const wompiWebhook = https.onRequest((req, res) => {
    (async () => {
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

            if (!receivedChecksum || !eventTimestamp || !tx) {
                logger.warn("Request is missing signature, timestamp, or transaction data.", {
                    hasChecksum: !!receivedChecksum,
                    hasTimestamp: !!eventTimestamp,
                    hasTransaction: !!tx,
                });
                res.status(400).json({ error: "Missing signature, timestamp, or transaction info" });
                return;
            }

            const concatenatedProperties = `${tx.id}${tx.status}${tx.amount_in_cents}`;
            const stringToSign = `${concatenatedProperties}${eventTimestamp}${WOMPI_EVENT_SECRET}`;

            const computedChecksum = crypto.createHash("sha256")
                .update(stringToSign)
                .digest("hex");

            if (computedChecksum !== receivedChecksum) {
                logger.warn("Invalid checksum.", {
                    received: receivedChecksum,
                    computed: computedChecksum,
                    stringToSign: stringToSign.replace(WOMPI_EVENT_SECRET, '***SECRET***') // Avoid logging the secret
                });
                res.status(403).json({ error: "Invalid checksum." });
                return;
            }
            
            logger.info("Checksum verified. Processing event for reference:", tx.reference);

            if (!tx.reference) {
                logger.error("Transaction is missing a reference.", tx);
                res.status(400).json({ error: "Transaction reference is missing." });
                return;
            }

            if (String(tx.status).toUpperCase() === 'APPROVED') {
                const registrationCode = generateRegistrationCode();

                // Guardamos el doc bajo payment_codes/{registrationCode}
                const codeDocRef = db.collection("payment_codes").doc(String(registrationCode));
                await codeDocRef.set({
                    status: 'APPROVED',
                    registrationCode,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    transactionId: tx.id || null,
                    reference: tx.reference || null, // guardar la reference por si la necesitas
                    used: false,
                });

                // Opcional: guardar un índice para buscar por reference rápidamente
                if (tx.reference) {
                    await db.collection("payment_references").doc(String(tx.reference)).set({
                        registrationCode,
                        transactionId: tx.id || null,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }

                logger.info(`Payment ${tx.reference} approved. Generated code: ${registrationCode}`);
            } else {
                // Si no fue aprobado, preferimos crear un doc por reference (no por code)
                // para que puedas ver el estado de la transacción
                const refDoc = db.collection("payment_references").doc(String(tx.reference));
                await refDoc.set({
                    status: tx.status || 'UNKNOWN',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    transactionId: tx.id || null,
                }, { merge: true });
                logger.info(`Payment ${tx.reference} has status: ${tx.status}`);
            }

            res.status(200).json({ received: true });

        } catch (err) {
            logger.error('Unexpected error in wompiWebhook:', err);
            res.status(500).json({ error: "Internal error" });
        }
    })();
});

/**
 * Callable function: registerWithCode
 *
 * Input: { email: string, password: string, registrationCode: string }
 * Flow:
 *  - normalize registrationCode
 *  - check payment_codes/{CODE} exists, status == 'APPROVED', used != true
 *  - create user via Admin SDK
 *  - runTransaction:
 *      - re-check code unused
 *      - mark code used (used, usedBy, usedAt)
 *      - create users/{uid} doc
 *  - on success: createCustomToken(uid) and return it
 *  - on transaction failure: delete created user and return an error
 */
export const registerWithCode = https.onCall(async (data, context) => {
  // Basic validation
  const email = ((data?.email || '') as string).toString().trim().toLowerCase();
  const password = ((data?.password || '') as string).toString();
  const rawCode = ((data?.registrationCode || '') as string).toString();

  // Sanitizar código: normalizar unicode y mantener solo A-Z0-9, uppercase
  const registrationCode = rawCode.normalize('NFKC').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  if (!email || !password || !registrationCode) {
    throw new https.HttpsError('invalid-argument', 'Email, password y registrationCode son requeridos.');
  }

  const codeRef = db.collection('payment_codes').doc(registrationCode);

  // 1) lectura previa para dar mensajes claros
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

  // 2) Crear usuario en Auth (Admin SDK)
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

  // 3) Transaction: re-check code and mark used + create users/{uid}
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

      // marcar como usado
      tx.update(codeRef, {
        used: true,
        usedBy: userRecord.uid,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // crear user doc
      const userDocRef = db.collection('users').doc(userRecord.uid);
      tx.set(userDocRef, {
        email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  } catch (txErr: any) {
    logger.error('Transaction failed; cleaning up created user', { txErr, uid: userRecord.uid });
    // limpiar: borrar el usuario creado para evitar huérfanos
    try {
      await admin.auth().deleteUser(userRecord.uid);
      logger.info('Deleted created user after tx failure', { uid: userRecord.uid });
    } catch (cleanupErr) {
      logger.error('Failed to delete user after tx failure', { cleanupErr, uid: userRecord.uid });
    }

    // Si txErr es HttpsError, propágalo (mantenemos el mensaje para el cliente)
    if (txErr instanceof https.HttpsError) {
      throw txErr;
    }
    throw new https.HttpsError('aborted', 'No se pudo consumir el código. Intenta de nuevo.');
  }

  // 4) Generar custom token y devolverlo
  try {
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    return { customToken };
  } catch (err: any) {
    logger.error('Failed to create customToken', { err, uid: userRecord.uid });
    // Nota: si esto falla, tienes un usuario creado y marcado como used; decide política
    throw new https.HttpsError('internal', 'No se pudo generar el token de autenticación.');
  }
});
