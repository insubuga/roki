import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get latest wearable data
    const wearableData = await base44.entities.WearableData.filter(
      { user_email: user.email },
      '-created_date',
      1
    );

    if (!wearableData || wearableData.length === 0) {
      return Response.json({ suggestions: [] });
    }

    const data = wearableData[0];
    const suggestions = [];

    // Low recovery score → Recovery supplements
    if (data.recovery_score < 75) {
      const products = await base44.entities.Product.filter({ category: 'recovery' });
      if (products.length > 0) {
        suggestions.push({
          product: products[0],
          reason: 'Your recovery score is low. This can help speed up muscle recovery.',
          priority: 'high'
        });
      }
    }

    // High intensity workout → BCAA/Protein
    if (data.workout_intensity === 'high' || data.workout_intensity === 'extreme') {
      const bcaaProducts = await base44.entities.Product.filter({ category: 'bcaa' });
      const proteinProducts = await base44.entities.Product.filter({ category: 'protein' });
      
      if (bcaaProducts.length > 0) {
        suggestions.push({
          product: bcaaProducts[0],
          reason: 'After intense workouts, BCAAs help reduce muscle breakdown.',
          priority: 'high'
        });
      }
      
      if (proteinProducts.length > 0) {
        suggestions.push({
          product: proteinProducts[0],
          reason: 'High-intensity training increases protein needs for muscle repair.',
          priority: 'medium'
        });
      }
    }

    // Low sleep → Sleep support
    if (data.sleep_hours < 6.5) {
      // For now, suggest vitamins as sleep support
      const vitaminProducts = await base44.entities.Product.filter({ category: 'vitamins' });
      if (vitaminProducts.length > 0) {
        suggestions.push({
          product: vitaminProducts[0],
          reason: 'Poor sleep detected. Consider supplements that support rest and recovery.',
          priority: 'medium'
        });
      }
    }

    // Dehydration → Hydration/Electrolytes
    if (data.hydration_level === 'low' || data.hydration_level === 'moderate') {
      const hydrationProducts = await base44.entities.Product.filter({ category: 'hydration' });
      if (hydrationProducts.length > 0) {
        suggestions.push({
          product: hydrationProducts[0],
          reason: 'Hydration levels are suboptimal. Electrolytes can help maintain balance.',
          priority: 'high'
        });
      }
    }

    // Pre-workout suggestion for next workout
    const preWorkoutProducts = await base44.entities.Product.filter({ category: 'pre-workout' });
    if (preWorkoutProducts.length > 0 && suggestions.length < 3) {
      suggestions.push({
        product: preWorkoutProducts[0],
        reason: 'Boost energy and focus for your next workout session.',
        priority: 'low'
      });
    }

    // Create notification for high-priority suggestions
    if (suggestions.length > 0) {
      const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
      if (highPrioritySuggestions.length > 0) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: user.email,
          type: 'system',
          title: '💡 Smart Supplement Suggestions',
          message: `Based on your metrics, we recommend ${highPrioritySuggestions[0].product.name}`,
          action_url: 'Shop',
          priority: 'normal'
        });
      }
    }

    return Response.json({ suggestions });
  } catch (error) {
    console.error('Auto-suggest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});