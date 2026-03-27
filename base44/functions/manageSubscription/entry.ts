import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, subscription_id } = await req.json();

    if (!action) {
      return Response.json({ error: 'Action required' }, { status: 400 });
    }

    // Get user's subscription from database
    const subscriptions = await base44.entities.Subscription.filter({ 
      user_email: user.email 
    });
    
    if (!subscriptions[0]?.stripe_subscription_id) {
      return Response.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const stripeSubId = subscriptions[0].stripe_subscription_id;

    switch (action) {
      case 'cancel': {
        // Cancel at period end
        const subscription = await stripe.subscriptions.update(stripeSubId, {
          cancel_at_period_end: true,
        });

        await base44.entities.Subscription.update(subscriptions[0].id, {
          status: 'canceling',
        });

        console.log('Subscription set to cancel:', stripeSubId);
        return Response.json({ 
          success: true,
          cancel_at: subscription.cancel_at 
        });
      }

      case 'reactivate': {
        // Remove cancel at period end
        await stripe.subscriptions.update(stripeSubId, {
          cancel_at_period_end: false,
        });

        await base44.entities.Subscription.update(subscriptions[0].id, {
          status: 'active',
        });

        console.log('Subscription reactivated:', stripeSubId);
        return Response.json({ success: true });
      }

      case 'cancel_immediately': {
        // Cancel immediately
        await stripe.subscriptions.cancel(stripeSubId);

        await base44.entities.Subscription.update(subscriptions[0].id, {
          plan: 'free',
          status: 'canceled',
          stripe_subscription_id: null,
        });

        console.log('Subscription canceled immediately:', stripeSubId);
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Subscription management error:', error);
    return Response.json({ 
      error: 'Failed to manage subscription',
      details: error.message 
    }, { status: 500 });
  }
});