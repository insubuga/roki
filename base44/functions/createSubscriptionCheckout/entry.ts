import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Live mode price IDs
const SUBSCRIPTION_PRICE_MAP = {
  'core':     'price_1TDIFwAdksn5wF2RuVt0wCMO',
  'priority': 'price_1TDIFwAdksn5wF2RCCociyOb',
};

const PLAN_DETAILS = {
  core:     { credits: 5,  turnaround: 48, sneaker: 30, premium: false, rush: 1,   rushFee: 12, dispatch: false, price: 39 },
  priority: { credits: 10, turnaround: 24, sneaker: 50, premium: true,  rush: 999, rushFee: 0,  dispatch: true,  price: 59 },
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
    const plan = PLAN_DETAILS[plan_id];

    // Get existing subscription record
    const existingSubscriptions = await base44.entities.Subscription.filter({ user_email: user.email });
    const existingSub = existingSubscriptions[0];

    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://rokicyclenetwork.com';

    // ── UPGRADE / DOWNGRADE: user already has an active Stripe subscription ──
    if (existingSub?.stripe_subscription_id && ['active', 'canceling'].includes(existingSub.status)) {
      const stripeSub = await stripe.subscriptions.retrieve(existingSub.stripe_subscription_id);

      // If the plan is already the same, nothing to do
      if (existingSub.plan === plan_id && existingSub.status === 'active') {
        return Response.json({ error: 'Already on this plan' }, { status: 400 });
      }

      // Find the current subscription item to replace
      const currentItem = stripeSub.items.data[0];

      // Perform the upgrade/downgrade immediately via proration
      const updatedSub = await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
        items: [{ id: currentItem.id, price: priceId }],
        proration_behavior: 'create_prorations',
        cancel_at_period_end: false,
      });

      // Update our database record immediately
      await base44.entities.Subscription.update(existingSub.id, {
        plan: plan_id,
        monthly_price: plan.price,
        status: 'active',
        laundry_credits: plan.credits,
        laundry_turnaround_hours: plan.turnaround,
        sneaker_cleaning_discount: plan.sneaker,
        premium_sneaker_cleaning: plan.premium,
        rush_deliveries_included: plan.rush,
        rush_delivery_fee: plan.rushFee,
        priority_dispatch: plan.dispatch,
        priority_locker: plan_id === 'priority',
        renewal_date: new Date(updatedSub.current_period_end * 1000).toISOString().split('T')[0],
      });

      console.log('Subscription upgraded/downgraded to:', plan_id, 'for', user.email);
      return Response.json({ success: true, upgraded: true, plan_id });
    }

    // ── NEW SUBSCRIPTION: create checkout session ──
    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/Subscription?payment=success`,
      cancel_url: `${origin}/Subscription?payment=cancelled`,
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
    return Response.json({ url: session.url, session_id: session.id });

  } catch (error) {
    console.error('Subscription checkout error:', error);
    return Response.json({ error: 'Failed to create subscription checkout', details: error.message }, { status: 500 });
  }
});