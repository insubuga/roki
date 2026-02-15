import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICE_MAP = {
  '1': 'price_1T1Aw7A10LjEPy7hS9Ieq4IS',
  '3': 'price_1T1Aw7A10LjEPy7h3ROuDgin',
  '6': 'price_1T1Aw7A10LjEPy7h7AQfY148',
  '12': 'price_1T1Aw7A10LjEPy7hRYrwTKFQ',
  '24': 'price_1T1Aw7A10LjEPy7hS4zxwGU6',
  '72': 'price_1T1Aw7A10LjEPy7hRjKAo3uR',
  '168': 'price_1T1Aw7A10LjEPy7hHC6fDr7G',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { duration, gym_name, gym_address } = await req.json();

    if (!duration || !PRICE_MAP[duration]) {
      return Response.json({ error: 'Invalid duration' }, { status: 400 });
    }

    const priceId = PRICE_MAP[duration];
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/Profile?payment=success`,
      cancel_url: `${req.headers.get('origin')}/Profile?payment=cancelled`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_email: user.email,
        duration: duration,
        gym_name: gym_name || '',
        gym_address: gym_address || '',
        payment_type: 'locker_rental',
      },
    });

    return Response.json({ 
      url: session.url,
      session_id: session.id 
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    return Response.json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    }, { status: 500 });
  }
});