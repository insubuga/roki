
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
  // RokiBot message
  vantaBotMessage: (user_email, message) => 
    createNotification(user_email, 'vantabot', 'RokiBot', message, 'RokiBot', 'low'),

  // Subscription changes
  subscriptionUpgraded: (user_email, plan) =>
    createNotification(user_email, 'subscription', 'Everything set', `${plan} plan active`, 'Subscription', 'low'),

  subscriptionDowngraded: (user_email, plan) =>
    createNotification(user_email, 'subscription', 'Plan updated', `Now on ${plan}`, 'Subscription', 'low'),

  // Wearable data - silent
  wearableSync: (user_email) =>
    createNotification(user_email, 'wearable', 'Synced', 'Data updated', 'Wearables', 'low'),

  wearableAnomaly: (user_email, metric, value) =>
    createNotification(user_email, 'wearable', 'Noted', `${metric}: ${value}`, 'Wearables', 'low'),

  lowRecovery: (user_email, score) =>
    createNotification(user_email, 'wearable', `Recovery at ${score}`, 'Support available if needed', 'Wearables', 'low'),

  // Laundry status - informational only
  laundryReady: (user_email) =>
    createNotification(user_email, 'laundry', 'Ready', 'Laundry available for pickup', 'LaundryOrder', 'low'),

  laundryScheduled: (user_email, date) =>
    createNotification(user_email, 'laundry', 'Scheduled', `Pickup: ${date}`, 'LaundryOrder', 'low'),

  // Delivery updates - status only
  deliveryDispatched: (user_email, orderNumber) =>
    createNotification(user_email, 'delivery', 'En route', `Order #${orderNumber}`, 'Deliveries', 'low'),

  deliveryArriving: (user_email) =>
    createNotification(user_email, 'delivery', 'Arriving', '~10 minutes', 'Deliveries', 'low'),

  deliveryCompleted: (user_email) =>
    createNotification(user_email, 'delivery', 'Delivered', 'Order complete', 'Deliveries', 'low'),
};
