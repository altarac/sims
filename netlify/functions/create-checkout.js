const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { uid } = JSON.parse(event.body);

        // Create the Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'OmniLabs Premium Access',
                            description: 'Lifetime access to all 46+ simulations.',
                        },
                        unit_amount: 999, // $9.99
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            // event.headers.origin automatically sends them back to your exact Netlify domain
            success_url: `${event.headers.origin}/?success=true`, 
            cancel_url: `${event.headers.origin}/?canceled=true`,
            client_reference_id: uid, 
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ id: session.id }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
