
import { https, logger } from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import type { Request, Response } from "express";

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
  let code = "";
  for (let i = 0; i < 4; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 2; i++) code += digits.charAt(Math.floor(Math.random() * digits.length));
  return code.split("").sort(() => 0.5 - Math.random()).join("");
}

/**
 * Safely resolves a dotted path from an object and returns a string.
 * Missing values result in an empty string, which is crucial for Wompi's checksum.
 */
function getByPath(obj: any, path: string): string {
  if (!path) return "";
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && Object.prototype.hasOwnProperty.call(current, part)) {
      current = current[part];
    } else {
      return ""; // Path does not exist
    }
  }
  if (current === null || current === undefined) return ""; // Explicitly handle null/undefined
  return String(current);
}

/**
 * Computes a SHA-256 hash and returns it in hexadecimal format.
 */
function computeSha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export const wompiWebhook = https.onRequest(async (req: Request, res: Response) => {
  try {
    const WOMPI_EVENT_SECRET = process.env.WOMPI_EVENT_SECRET || '';
    if (!WOMPI_EVENT_SECRET) {
      logger.error('WOMPI_EVENT_SECRET missing from environment variables.');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    const event = req.body || {};
    const signature = event.signature || {};

    const receivedChecksum = (signature.checksum || '').trim();

    if (!receivedChecksum) {
      logger.warn('Request body missing Wompi signature.checksum.');
      return res.status(400).json({ error: 'Missing signature information.' });
    }

    const props: string[] = Array.isArray(signature.properties) ? signature.properties : [];
    const dataRoot = event.data || {};

    const valuesConcat = props.map(p => getByPath(dataRoot, p)).join('');
    
    // Timestamp from the top-level of the event, as per Wompi's documentation
    const timestamp = event.timestamp || '';

    const stringToSign = `${valuesConcat}${timestamp}${WOMPI_EVENT_SECRET}`;

    const computedChecksum = computeSha256Hex(stringToSign);

    if (computedChecksum.toLowerCase() !== receivedChecksum.toLowerCase()) {
      logger.warn('Invalid checksum.', {
        details: {
          received: receivedChecksum,
          computed: computedChecksum,
          stringToSignUsed: stringToSign.replace(WOMPI_EVENT_SECRET, '***SECRET***'), // Avoid logging the secret
        }
      });
      return res.status(403).json({ error: 'Invalid checksum.' });
    }

    // Checksum is valid, proceed with business logic
    logger.info('Checksum verified. Processing event.');

    const transaction = event.data?.transaction;
    if (!transaction) {
      logger.error('Event data is missing transaction object.', event.data);
      return res.status(400).json({ error: 'Missing transaction data.' });
    }

    const { reference, status, id: transactionId } = transaction;

    if (!reference) {
      logger.error('Transaction is missing a reference.', transaction);
      return res.status(400).json({ error: 'Transaction reference is missing.' });
    }

    const paymentRef = db.collection("payment_codes").doc(String(reference));

    if (String(status).toUpperCase() === 'APPROVED') {
      const registrationCode = generateRegistrationCode();
      await paymentRef.set({
        status: 'APPROVED',
        registrationCode,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        transactionId: transactionId || null,
        used: false,
      });
      logger.info(`Payment ${reference} approved. Generated code: ${registrationCode}`);
    } else {
      await paymentRef.set({
        status: status || 'UNKNOWN',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        transactionId: transactionId || null,
      }, { merge: true });
      logger.info(`Payment ${reference} has status: ${status}`);
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    logger.error('Unexpected error in wompiWebhook:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});
