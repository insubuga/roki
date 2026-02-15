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
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata;

      console.log('Checkout completed for:', metadata.user_email);

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

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({ 
      error: 'Webhook processing failed',
      details: error.message 
    }, { status: 500 });
  }
});