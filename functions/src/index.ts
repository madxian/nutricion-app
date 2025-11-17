
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
