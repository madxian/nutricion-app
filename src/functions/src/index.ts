
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

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
  // Shuffle the code to mix letters and numbers
  return code.split("").sort(() => 0.5 - Math.random()).join("");
}

/**
 * Public Cloud Function to receive webhook events from Wompi.
 * It verifies the request signature to ensure it comes from Wompi.
 */
export const wompiWebhook = functions
  .region("us-central1") // Specify region if not default
  .runWith({
    // Make secrets available to the function
    secrets: ["WOMPI_EVENT_SECRET"],
  })
  .https.onRequest(async (request, response) => {
    const wompiEventSecret = process.env.WOMPI_EVENT_SECRET;
    if (!wompiEventSecret) {
        functions.logger.error("WOMPI_EVENT_SECRET is not set.");
        response.status(500).send("Server configuration error.");
        return;
    }

    // --- Signature Verification Logic (Wompi Event Webhook) ---
    const receivedChecksum = request.body.signature?.checksum;
    const eventProperties = request.body.signature?.properties;

    if (!receivedChecksum || !eventProperties) {
        functions.logger.warn("Request missing signature or properties.");
        response.status(400).send("Missing signature information.");
        return;
    }
    
    // The string to sign is a concatenation of property values + the event secret
    const stringToSign = eventProperties
        .map((prop: string) => {
            // Path can be nested, e.g., 'transaction.id'
            const propPath = prop.split('.');
            let value = request.body.data;
            for (const key of propPath) {
                value = value?.[key];
            }
            return value;
        })
        .join('') + wompiEventSecret;

    const computedChecksum = crypto.createHash('sha256').update(stringToSign).digest('hex');

    if (computedChecksum !== receivedChecksum) {
        functions.logger.warn("Invalid checksum.", {
            received: receivedChecksum,
            computed: "hidden", // Avoid logging the computed checksum for security
        });
        response.status(403).send("Invalid checksum.");
        return;
    }

    // --- Signature is valid, proceed with logic ---
    functions.logger.info("Checksum verified. Processing Wompi event.");

    const event = request.body.data;
    const transaction = event.transaction;
    const reference = transaction.reference;
    const status = transaction.status; // e.g., 'APPROVED', 'DECLINED'

    if (!reference) {
        functions.logger.error("Transaction is missing a reference.", transaction);
        response.status(400).send("Transaction reference is missing.");
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
            functions.logger.info(`Payment ${reference} approved. Generated code: ${registrationCode}`);
        } else {
            await paymentRef.set({
                status: status, // Could be 'DECLINED', 'VOIDED', etc.
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                transactionId: transaction.id,
            }, { merge: true }); // Merge to not overwrite a potential existing document
            functions.logger.info(`Payment ${reference} has status: ${status}`);
        }

        // Respond to Wompi to acknowledge receipt of the event.
        response.status(200).send({ received: true });
    } catch (dbError) {
        functions.logger.error(`Error writing to Firestore for reference ${reference}:`, dbError);
        response.status(500).send("Internal server error while processing payment.");
    }
});
