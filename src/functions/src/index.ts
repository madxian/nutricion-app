
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
  .region("us-central1")
  .runWith({
    secrets: ["WOMPI_EVENT_SECRET"],
  })
  .https.onRequest(async (request, response) => {
    try {
      const event = request.body || {};
      const signature = event.signature || {};
      
      const receivedChecksum = signature.checksum || '';

      if (!receivedChecksum) {
        functions.logger.warn("Request body missing Wompi signature checksum.");
        response.status(400).json({ error: "Missing signature information." });
        return;
      }
      
      const properties = Array.isArray(signature.properties) ? signature.properties : [];
      const dataRoot = event.data || {};

      const propertyValues = properties.map((path: string) => {
        const parts = path.split('.');
        let value: any = dataRoot;
        for (const part of parts) {
            if (value && Object.prototype.hasOwnProperty.call(value, part)) {
                value = value[part];
            } else {
                value = '';
                break;
            }
        }
        return (value === null || value === undefined) ? '' : String(value);
      }).join('');

      const timestamp = event.timestamp || '';
      const wompiEventSecret = process.env.WOMPI_EVENT_SECRET || '';
      
      const stringToSign = `${propertyValues}${timestamp}${wompiEventSecret}`;
      
      const computedChecksum = crypto.createHash('sha256').update(stringToSign).digest('hex');

      if (computedChecksum.toLowerCase() !== receivedChecksum.toLowerCase()) {
        functions.logger.warn("Invalid checksum.", {
            details: {
                stringToSign: stringToSign, // Be careful logging this if secret is sensitive
                computed: computedChecksum,
                received: receivedChecksum,
            }
        });
        response.status(403).json({ error: "Invalid checksum." });
        return;
      }

      // --- Signature is valid, proceed with logic ---
      functions.logger.info("Checksum verified. Processing Wompi event.");

      const transaction = event.data?.transaction;
      const reference = transaction?.reference;
      const status = transaction?.status;

      if (!reference) {
          functions.logger.error("Transaction is missing a reference.", transaction);
          response.status(400).json({ error: "Transaction reference is missing." });
          return;
      }

      const paymentRef = db.collection("payment_codes").doc(reference);

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
              status: status,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              transactionId: transaction.id,
          }, { merge: true });
          functions.logger.info(`Payment ${reference} has status: ${status}`);
      }

      response.status(200).json({ received: true });
    } catch (err) {
        functions.logger.error("Error verifying Wompi webhook", err);
        response.status(500).json({ error: "Internal server error" });
    }
});
