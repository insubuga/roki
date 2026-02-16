import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cartItems, deliveryType = 'standard' } = await req.json();

    if (!cartItems || cartItems.length === 0) {
      return Response.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Calculate totals
    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);
    const deliveryFee = subtotal > 50 ? 0 : 4.99;
    const rushFee = deliveryType === 'rush' ? 15 : 0;
    const total = subtotal + deliveryFee + rushFee;

    // Create line items for Stripe
    const lineItems = cartItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product_name,
          images: item.image_url ? [item.image_url] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity || 1,
    }));

    // Add delivery fee if applicable
    if (deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Standard Delivery',
          },
          unit_amount: Math.round(deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    // Add rush fee if applicable
    if (rushFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Rush Delivery',
          },
          unit_amount: Math.round(rushFee * 100),
        },
        quantity: 1,
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/Cart?payment=success`,
      cancel_url: `${req.headers.get('origin')}/Cart?payment=cancelled`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_email: user.email,
        payment_type: 'supplement_order',
        delivery_type: deliveryType,
        cart_items: JSON.stringify(cartItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity || 1,
          price: item.price,
        }))),
      },
    });

    return Response.json({ 
      url: session.url,
      session_id: session.id 
    });
  } catch (error) {
    console.error('Cart checkout error:', error);
    return Response.json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    }, { status: 500 });
  }
});