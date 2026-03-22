import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Stripe price IDs for Roki subscription plans
const SUBSCRIPTION_PRICE_MAP = {
  'core':     'price_1TCvGHA10LjEPy7hjgahMk9h',
  'priority': 'price_1TCvGHA10LjEPy7hK7pvGjNH',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan_id } = await req.json();

    if (!plan_id || !['core', 'priority'].includes(plan_id)) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = SUBSCRIPTION_PRICE_MAP[plan_id];
    if (!priceId) {
      return Response.json({ error: 'Plan not found' }, { status: 400 });
    }

    // Check if user already has a Stripe customer ID
    let customerId;
    const existingSubscriptions = await base44.entities.Subscription.filter({ 
      user_email: user.email 
    });
    
    if (existingSubscriptions[0]?.stripe_customer_id) {
      customerId = existingSubscriptions[0].stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          user_email: user.email,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0,3).join('/') || 'https://rokicyclenetwork.com'}/Subscription?payment=success`,
      cancel_url: `${req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0,3).join('/') || 'https://rokicyclenetwork.com'}/Subscription?payment=cancelled`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_email: user.email,
        plan_id: plan_id,
      },
      subscription_data: {
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          user_email: user.email,
          plan_id: plan_id,
        },
      },
    });

    console.log('Subscription checkout created:', session.id, 'for plan:', plan_id);

    return Response.json({ 
      url: session.url,
      session_id: session.id 
    });
  } catch (error) {
    console.error('Subscription checkout error:', error);
    return Response.json({ 
      error: 'Failed to create subscription checkout',
      details: error.message 
    }, { status: 500 });
  }
});