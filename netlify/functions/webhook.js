const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Initialize Firebase Admin cleanly in a serverless environment
if (!admin.apps.length) {
    // In Netlify, you'll paste your service account JSON directly into an Environment Variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const sig = event.headers['stripe-signature'];
    let stripeEvent;

    try {
        // Verify the event using your Webhook Secret
        stripeEvent = stripe.webhooks.constructEvent(
            event.body, 
            sig, 
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook Error:', err.message);
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    // Handle the successful payment
    if (stripeEvent.type === 'checkout.session.completed') {
        const session = stripeEvent.data.object;
        const uid = session.client_reference_id;

        if (uid) {
            console.log(`Upgrading user: ${uid}`);
            
            // Note: If you are using a specific App ID in Firebase, replace 'default-app-id'
            const subRef = db.collection('artifacts')
                             .doc('default-app-id')
                             .collection('users')
                             .doc(uid)
                             .collection('subscription')
                             .doc('status');
            
            await subRef.set({
                hasPaid: true,
                upgradedAt: new Date().toISOString(),
                stripeSessionId: session.id
            }, { merge: true });
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true }),
    };
};
