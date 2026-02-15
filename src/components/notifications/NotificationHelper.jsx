import { base44 } from '@/api/base44Client';

export const createNotification = async (user_email, type, title, message, action_url = null, priority = 'normal') => {
  try {
    await base44.entities.Notification.create({
      user_email,
      type,
      title,
      message,
      action_url,
      priority,
      read: false,
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

export const NotificationTriggers = {
  // VantaBot message
  vantaBotMessage: (user_email, message) => 
    createNotification(user_email, 'vantabot', 'VantaBot Message', message, 'VantaBot', 'normal'),

  // Subscription changes
  subscriptionUpgraded: (user_email, plan) =>
    createNotification(user_email, 'subscription', 'Plan Upgraded', `You're now on the ${plan} plan with enhanced benefits.`, 'Subscription', 'high'),

  subscriptionDowngraded: (user_email, plan) =>
    createNotification(user_email, 'subscription', 'Plan Changed', `You've switched to the ${plan} plan.`, 'Subscription', 'normal'),

  // Wearable data
  wearableSync: (user_email) =>
    createNotification(user_email, 'wearable', 'Data Synced', 'Your wearable data has been updated.', 'Wearables', 'low'),

  wearableAnomaly: (user_email, metric, value) =>
    createNotification(user_email, 'wearable', 'Health Alert', `${metric} detected: ${value}. Consider reviewing your activity.`, 'Wearables', 'high'),

  lowRecovery: (user_email, score) =>
    createNotification(user_email, 'wearable', 'Low Recovery Score', `Your recovery is at ${score}. VantaBot suggests rest or recovery support.`, 'Wearables', 'normal'),

  // Laundry reminders
  laundryReady: (user_email) =>
    createNotification(user_email, 'laundry', 'Laundry Ready', 'Your activewear is clean and ready for pickup!', 'Activewear', 'normal'),

  laundryScheduled: (user_email, date) =>
    createNotification(user_email, 'laundry', 'Drop-off Scheduled', `Laundry pickup scheduled for ${date}.`, 'Activewear', 'low'),

  // Delivery updates
  deliveryDispatched: (user_email, orderNumber) =>
    createNotification(user_email, 'delivery', 'Order Dispatched', `Order #${orderNumber} is on its way!`, 'Deliveries', 'normal'),

  deliveryArriving: (user_email) =>
    createNotification(user_email, 'delivery', 'Delivery Arriving Soon', 'Your order will arrive in ~10 minutes.', 'Deliveries', 'high'),

  deliveryCompleted: (user_email) =>
    createNotification(user_email, 'delivery', 'Delivery Complete', 'Your order has been delivered.', 'Deliveries', 'low'),
};