import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    console.error('Missing signature or webhook secret');
    return Response.json({ error: 'Webhook configuration error' }, { status: 400 });
  }

  let event;
  
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('Processing webhook event:', event.type);

  try {
    // Handle one-time payment checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata;

      console.log('Checkout completed for:', metadata.user_email, 'mode:', session.mode);

      // Handle subscription checkout
      if (session.mode === 'subscription') {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Update or create subscription in database
        const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
          user_email: metadata.user_email
        });

        const planDetails = {
          core:     { credits: 5,   turnaround: 48, sneaker: 30, premium: false, rush: 1,   rushFee: 12, dispatch: false, price: 39 },
          priority: { credits: 10,  turnaround: 24, sneaker: 50, premium: true,  rush: 999, rushFee: 0,  dispatch: true,  price: 59 },
        };

        const plan = planDetails[metadata.plan_id] || planDetails.core;

        if (existingSubs[0]) {
          await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, {
            plan: metadata.plan_id,
            monthly_price: plan.price,
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscription.id,
            status: 'active',
            laundry_credits: plan.credits,
            laundry_turnaround_hours: plan.turnaround,
            sneaker_cleaning_discount: plan.sneaker,
            premium_sneaker_cleaning: plan.premium,
            rush_deliveries_included: plan.rush,
            rush_delivery_fee: plan.rushFee,
            priority_dispatch: plan.dispatch,
            priority_locker: true,
            renewal_date: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0],
          });
        } else {
          await base44.asServiceRole.entities.Subscription.create({
            user_email: metadata.user_email,
            plan: metadata.plan_id,
            monthly_price: plan.price,
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscription.id,
            status: 'active',
            laundry_credits: plan.credits,
            laundry_turnaround_hours: plan.turnaround,
            sneaker_cleaning_discount: plan.sneaker,
            premium_sneaker_cleaning: plan.premium,
            rush_deliveries_included: plan.rush,
            rush_delivery_fee: plan.rushFee,
            priority_dispatch: plan.dispatch,
            priority_locker: true,
            renewal_date: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0],
          });
        }

        console.log('Subscription activated:', metadata.plan_id, 'for', metadata.user_email);
      } 
      // Handle supplement order
      else if (metadata.payment_type === 'supplement_order') {
        const cartItems = JSON.parse(metadata.cart_items);
        
        // Create order record
        const order = await base44.asServiceRole.entities.Order.create({
          user_email: metadata.user_email,
          items: cartItems,
          total: session.amount_total / 100,
          delivery_type: metadata.delivery_type || 'standard',
          status: 'confirmed',
          estimated_delivery: new Date(Date.now() + (metadata.delivery_type === 'rush' ? 4 : 24) * 60 * 60 * 1000).toISOString(),
        });

        console.log('Order created:', order.id);

        // Clear user's cart
        const userCartItems = await base44.asServiceRole.entities.CartItem.filter({
          user_email: metadata.user_email
        });
        
        for (const item of userCartItems) {
          await base44.asServiceRole.entities.CartItem.delete(item.id);
        }

        console.log('Cart cleared for user:', metadata.user_email);

        // Send notification
        await base44.asServiceRole.entities.Notification.create({
          user_email: metadata.user_email,
          type: 'delivery',
          title: 'Order Confirmed!',
          message: `Your order of ${cartItems.length} items is confirmed and will be delivered soon.`,
          action_url: '/Deliveries',
          priority: 'high',
        });
      }
      // Handle one-time payment (locker rental)
      else if (metadata.payment_type === 'locker_rental') {
        // Create payment record
        const payment = await base44.asServiceRole.entities.Payment.create({
          user_email: metadata.user_email,
          amount: session.amount_total / 100,
          payment_type: metadata.payment_type || 'locker_rental',
          status: 'completed',
          stripe_payment_id: session.payment_intent,
          description: `Locker rental for ${metadata.duration} hours at ${metadata.gym_name}`,
          rental_duration_hours: parseInt(metadata.duration),
        });

        console.log('Payment record created:', payment.id);

        // Find available locker at the gym
        const gyms = await base44.asServiceRole.entities.Gym.filter({
          name: metadata.gym_name,
          address: metadata.gym_address,
        });

        if (gyms.length > 0) {
          const gymId = gyms[0].id;
          const availableLockers = await base44.asServiceRole.entities.Locker.filter({
            gym_id: gymId,
            status: 'available',
          });

          if (availableLockers.length > 0) {
            const locker = availableLockers[0];
            const now = new Date();
            const bookingEnd = new Date(now.getTime() + parseInt(metadata.duration) * 60 * 60 * 1000);

            await base44.asServiceRole.entities.Locker.update(locker.id, {
              user_email: metadata.user_email,
              status: 'claimed',
              is_locked: true,
              booking_start: now.toISOString(),
              booking_end: bookingEnd.toISOString(),
            });

            console.log('Locker claimed:', locker.id);
          } else {
            console.error('No available lockers at gym:', gymId);
          }
        } else {
          console.error('Gym not found:', metadata.gym_name);
        }
      }
    }

    // Handle subscription renewal
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const customerEmail = invoice.customer_email;

        // Reset usage counters on renewal
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: subscription.id
        });

        if (subs[0]) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            laundry_credits_used: 0,
            rush_deliveries_used: 0,
            renewal_date: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0],
          });

          console.log('Subscription renewed and credits reset for:', customerEmail);
        }
      }
    }

    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      
      const subs = await base44.asServiceRole.entities.Subscription.filter({
        stripe_subscription_id: subscription.id
      });

      if (subs[0]) {
        await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
          plan: 'core',
          status: 'canceled',
          stripe_subscription_id: null,
          monthly_price: 0,
          laundry_credits: 2,
          laundry_turnaround_hours: 48,
          sneaker_cleaning_discount: 0,
          premium_sneaker_cleaning: false,
          rush_deliveries_included: 0,
          rush_delivery_fee: 15,
          priority_dispatch: false,
        });

        console.log('Subscription canceled and downgraded to free:', subs[0].user_email);
      }
    }

    // Handle payment failure — flip subscription to past_due and notify member
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      console.warn('Payment failed for invoice:', invoice.id, 'customer:', invoice.customer_email);

      if (invoice.subscription) {
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: invoice.subscription
        });
        if (subs[0]) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: 'past_due' });
          console.log('Subscription set to past_due for:', subs[0].user_email);

          await base44.asServiceRole.entities.Notification.create({
            user_email: subs[0].user_email,
            type: 'subscription',
            title: 'Payment Failed',
            message: 'Your subscription payment failed. Please update your payment method to keep your plan active.',
            priority: 'high',
            read: false,
          });
        }
      }
    }

    // Handle subscription updates
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      
      const subs = await base44.asServiceRole.entities.Subscription.filter({
        stripe_subscription_id: subscription.id
      });

      if (subs[0]) {
        const status = subscription.cancel_at_period_end ? 'canceling' : 'active';
        await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
          status: status,
          renewal_date: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0],
        });

        console.log('Subscription status updated:', status);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({ 
      error: 'Webhook processing failed',
      details: error.message 
    }, { status: 500 });
  }
});