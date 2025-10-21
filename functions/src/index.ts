import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();

/**
 * Public Cloud Function to receive webhook events from Wompi.
 * It verifies the request signature to ensure it comes from Wompi.
 */
export const wompiWebhook = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response) => {
    // 1. Get the signature from the request headers.
    const signatureHeader = request.headers["x-wompi-signature"];
    if (!signatureHeader || typeof signatureHeader !== "string") {
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
        // IMPORTANT: Wompi's documentation might be interpreted in different ways.
        // This implementation assumes the signature is calculated over the raw request body.
        // If this fails, we might need to stringify the JSON body instead.
        const bodyString = JSON.stringify(request.body);
        
        const signatureParts = signatureHeader.split(",").reduce((acc, part) => {
            const [key, value] = part.split("=");
            if (key && value) {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, string>);

        const timestamp = signatureParts.t;
        const receivedSignature = signatureParts.v1;

        if (!timestamp || !receivedSignature) {
            response.status(400).send("Invalid signature header format.");
            return;
        }

        const stringToSign = `${bodyString}${timestamp}${wompiEventSecret}`;

        const hmac = crypto.createHmac("sha256", wompiEventSecret);
        hmac.update(stringToSign);
        const computedSignature = hmac.digest("hex");

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
