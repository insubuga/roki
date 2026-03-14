// Single source of truth for subscription plans across the app
export const SUBSCRIPTION_PLANS = {
  core: {
    id: 'core',
    name: 'Core Readiness',
    price: 39,
    description: 'For the consistent trainer',
    laundryCredits: 5,
    turnaroundHours: 48,
    rushDeliveries: 1,
    rushDeliveryFee: 12,
    premiumSneakerCleaning: false,
    sneakerCleaningDiscount: 30,
    priorityDispatch: false,
    priorityLocker: false,
    features: [
      'Clean workout gear guaranteed',
      '48h turnaround SLA',
      '1 emergency rush credit/month',
      'Locker or pickup logistics',
      'Sneaker care included'
    ]
  },
  priority: {
    id: 'priority',
    name: 'Priority Readiness',
    price: 59,
    description: 'For the serious athlete',
    popular: true,
    laundryCredits: 10,
    turnaroundHours: 24,
    rushDeliveries: 999,
    rushDeliveryFee: 0,
    premiumSneakerCleaning: true,
    sneakerCleaningDiscount: 50,
    priorityDispatch: true,
    priorityLocker: true,
    features: [
      '24h turnaround SLA',
      'Unlimited rush deliveries',
      'Priority dispatch',
      'Premium locker zones',
      'Sneaker care included (premium)',
      'Personal readiness assistant'
    ]
  }
};

export const getPlanConfig = (planId) => SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.core;