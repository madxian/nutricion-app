
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Public Cloud Function to receive webhook events from Wompi.
 */
export const wompiWebhook = functions.https.onRequest(async (request, response) => {
    // Log the entire request body to see the structure of Wompi events.
    functions.logger.info("Wompi event received:", request.body);

    const event = request.body.data;
    const eventType = request.body.event;

    // A simple acknowledgment.
    // In a real application, you would add logic here based on the event type.
    // For example, if eventType is 'transaction.updated' and status is 'APPROVED',
    // you would find the user and grant them access.

    functions.logger.log(`Processing event type: ${eventType} for transaction ID: ${event.transaction.id}`);

    // You can access your secrets like this:
    // const wompiPublicKey = process.env.WOMPI_PUBLIC_KEY;
    // functions.logger.info("Using Wompi public key:", wompiPublicKey);


    // Respond to Wompi to acknowledge receipt of the event.
    // Wompi requires a 200 OK response to know the webhook is working.
    response.status(200).send({ received: true });
});
