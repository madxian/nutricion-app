
import { https, logger } from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * Generates a simple, semi-unique registration code.
 * Example: "AB12CD"
 * @return {string} A 6-character alphanumeric code.
 */
function generateRegistrationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = "0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  for (let i = 0; i < 2; i++) {
    code += nums.charAt(Math.floor(Math.random() * nums.length));
  }
  return code.split("").sort(() => 0.5 - Math.random()).join("");
}

// Helper to safely get nested properties from an object path string.
const getNestedValue = (obj: any, path: string): any => {
    if (obj === null || obj === undefined) {
        return "";
    }
    // Crucial fix: If the object is empty, it can't have nested properties.
    if (typeof obj === 'object' && Object.keys(obj).length === 0) {
        return null;
    }
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
};

/**
 * Public Cloud Function to receive webhook events from Wompi.
 * It verifies the request signature to ensure it comes from Wompi.
 */
export const wompiWebhook = https.onRequest(async (request, response) => {
    const wompiEventSecret = process.env.WOMPI_EVENT_SECRET;

    if (!wompiEventSecret) {
        logger.error("WOMPI_EVENT_SECRET is not set in environment variables.");
        response.status(500).json({ error: "Server configuration error." });
        return;
    }

    // --- Signature Verification Logic (Wompi Event Webhook) ---
    const receivedChecksum = request.body.signature?.checksum;
    const eventProperties = request.body.signature?.properties;

    if (!receivedChecksum || !Array.isArray(eventProperties)) {
        logger.warn("Request body missing Wompi signature checksum or properties.");
        response.status(400).json({ error: "Missing signature information." });
        return;
    }

    const stringToSign = eventProperties
        .map((prop: string) => {
            const value = getNestedValue(request.body.data, prop);
            return value !== null && value !== undefined ? value : "";
        })
        .join("") + wompiEventSecret;

    const computedChecksum = crypto.createHash("sha256").update(stringToSign).digest("hex");

    if (computedChecksum !== receivedChecksum) {
        logger.warn("Invalid checksum.", {
            received: receivedChecksum,
            computed: "hidden", // Avoid logging the computed checksum for security
        });
        response.status(403).json({ error: "Invalid checksum." });
        return;
    }

    // --- Signature is valid, proceed with logic ---
    logger.info("Checksum verified. Processing Wompi event.");

    const event = request.body.data;
    const transaction = event?.transaction;
    const reference = transaction?.reference;
    const status = transaction?.status;

    if (!reference) {
        logger.error("Transaction is missing a reference.", transaction);
        response.status(400).json({ error: "Transaction reference is missing." });
        return;
    }

    const paymentRef = db.collection("payment_codes").doc(reference);

    try {
        if (status === "APPROVED") {
            const registrationCode = generateRegistrationCode();
            await paymentRef.set({
                status: "APPROVED",
                registrationCode: registrationCode,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                transactionId: transaction.id,
                used: false,
            });
            logger.info(`Payment ${reference} approved. Generated code: ${registrationCode}`);
        } else {
            await paymentRef.set({
                status: status,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                transactionId: transaction.id,
            }, { merge: true });
            logger.info(`Payment ${reference} has status: ${status}`);
        }

        response.status(200).json({ received: true });
    } catch (dbError) {
        logger.error(`Error writing to Firestore for reference ${reference}:`, dbError);
        response.status(500).json({ error: "Internal server error while processing payment." });
    }
});
