import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;

    // Delete all user-related data
    console.log('Starting account deletion for:', userEmail);

    // Delete cart items
    const cartItems = await base44.asServiceRole.entities.CartItem.filter({ user_email: userEmail });
    for (const item of cartItems) {
      await base44.asServiceRole.entities.CartItem.delete(item.id);
    }

    // Delete orders
    const orders = await base44.asServiceRole.entities.Order.filter({ user_email: userEmail });
    for (const order of orders) {
      await base44.asServiceRole.entities.Order.delete(order.id);
    }

    // Delete laundry orders
    const laundryOrders = await base44.asServiceRole.entities.LaundryOrder.filter({ user_email: userEmail });
    for (const order of laundryOrders) {
      await base44.asServiceRole.entities.LaundryOrder.delete(order.id);
    }

    // Release any claimed lockers
    const lockers = await base44.asServiceRole.entities.Locker.filter({ user_email: userEmail });
    for (const locker of lockers) {
      await base44.asServiceRole.entities.Locker.update(locker.id, {
        status: 'available',
        user_email: null,
        booking_start: null,
        booking_end: null,
        is_locked: true,
      });
    }

    // Delete locker issues
    const issues = await base44.asServiceRole.entities.LockerIssue.filter({ user_email: userEmail });
    for (const issue of issues) {
      await base44.asServiceRole.entities.LockerIssue.delete(issue.id);
    }

    // Delete subscription
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ user_email: userEmail });
    for (const sub of subscriptions) {
      await base44.asServiceRole.entities.Subscription.delete(sub.id);
    }

    // Delete payments
    const payments = await base44.asServiceRole.entities.Payment.filter({ user_email: userEmail });
    for (const payment of payments) {
      await base44.asServiceRole.entities.Payment.delete(payment.id);
    }

    // Delete notifications
    const notifications = await base44.asServiceRole.entities.Notification.filter({ user_email: userEmail });
    for (const notif of notifications) {
      await base44.asServiceRole.entities.Notification.delete(notif.id);
    }

    // Delete wearable data
    const wearableData = await base44.asServiceRole.entities.WearableData.filter({ user_email: userEmail });
    for (const data of wearableData) {
      await base44.asServiceRole.entities.WearableData.delete(data.id);
    }

    console.log('Account data deleted successfully for:', userEmail);

    return Response.json({ 
      success: true,
      message: 'Account and all associated data have been deleted'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return Response.json({ 
      error: 'Failed to delete account',
      details: error.message 
    }, { status: 500 });
  }
});