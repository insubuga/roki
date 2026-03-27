// Single source of truth for subscription plans across the app
// Live mode Stripe Price IDs
export const STRIPE_PRICE_IDS = {
  core:     'price_1TDIFwAdksn5wF2RuVt0wCMO', // Core Readiness $39/mo
  priority: 'price_1TDIFwAdksn5wF2RCCociyOb', // Priority Readiness $59/mo
};

export const SUBSCRIPTION_PLANS = {
  core: {
    id: 'core',
    stripePriceId: 'price_1TDIFwAdksn5wF2RuVt0wCMO',
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
    stripePriceId: 'price_1TDIFwAdksn5wF2RCCociyOb',
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