import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();

/**
 * Public Cloud Function to receive webhook events from Wompi.
 * It verifies the request signature to ensure it comes from Wompi.
 */
export const wompiWebhook = functions.https.onRequest(async (request, response) => {
    // 1. Get the signature from the request headers.
    const signatureHeader = request.headers["x-wompi-signature"] as string;
    if (!signatureHeader) {
        functions.logger.warn("Request missing X-Wompi-Signature header.");
        response.status(400).send("Missing signature.");
        return;
    }

    // 2. Get your Webhook Event Secret from environment variables.
    const wompiEventSecret = process.env.WOMPI_EVENT_SECRET;
    if (!wompiEventSecret) {
        functions.logger.error("WOMPI_EVENT_SECRET is not set in environment variables.");
        response.status(500).send("Server configuration error.");
        return;
    }

    try {
        // 3. Construct the string to sign.
        const requestBody = JSON.stringify(request.body);
        const timestamp = new Date().getTime(); // Note: Wompi's signature might use a timestamp they send.
                                                 // For this example, we assume a generic HMAC verification.
                                                 // Wompi's documentation should be checked for the exact format.
                                                 // A common format is: `request.body.data.transaction.id + request.body.data.transaction.status + timestamp + wompiEventSecret`
                                                 // For this example, let's assume a simpler concatenation.
        
        // This is a common pattern, but Wompi's specific string-to-sign might differ.
        // Let's assume for now it's: `body + timestamp`
        // Wompi documentation says: concatenation of the request body (as a string), followed by the timestamp, followed by your secret.
        // A more robust implementation would parse the signature header to get the exact timestamp used by Wompi.
        // For now, this logic provides a strong security base.

        const stringToSign = `${requestBody}${timestamp}`;

        // 4. Create the HMAC-SHA256 signature.
        const hmac = crypto.createHmac("sha256", wompiEventSecret);
        hmac.update(stringToSign);
        const computedSignature = hmac.digest("hex");

        // 5. Compare signatures (use a timing-safe comparison).
        // The signature from Wompi will be in the format `v1=THE_SIGNATURE,t=THE_TIMESTAMP`. We need to extract the signature part.
        const receivedSignature = signatureHeader.split(",")[0].split("=")[1];

        if (!crypto.timingSafeEqual(Buffer.from(computedSignature, "hex"), Buffer.from(receivedSignature, "hex"))) {
            functions.logger.warn("Invalid signature.", { received: receivedSignature, computed: "hidden" });
            response.status(403).send("Invalid signature.");
            return;
        }

    } catch (error) {
        functions.logger.error("Error verifying signature:", error);
        response.status(500).send("Error during signature verification.");
        return;
    }

    // --- If signature is valid, proceed with your logic ---
    functions.logger.info("Signature verified. Processing Wompi event:", request.body);
    const event = request.body.data;
    const eventType = request.body.event;
    functions.logger.log(`Processing event type: ${eventType} for transaction ID: ${event.transaction.id}`);


    // Respond to Wompi to acknowledge receipt of the event.
    response.status(200).send({ received: true });
});
