import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gym_id } = await req.json();

    // Fetch user's past locker bookings
    const userLockers = await base44.entities.Locker.filter({ 
      user_email: user.email 
    }, '-booking_start', 20);

    // Fetch all lockers at the gym
    const allLockers = await base44.entities.Locker.filter({ 
      gym_id: gym_id 
    });

    const availableLockers = allLockers.filter(l => l.status === 'available');
    const claimedLockers = allLockers.filter(l => l.status === 'claimed');

    // Fetch recent payments to understand usage patterns
    const recentPayments = await base44.entities.Payment.filter({
      user_email: user.email,
      payment_type: 'locker_rental'
    }, '-created_date', 10);

    // Build context for AI
    const prompt = `Analyze locker usage and provide intelligent recommendations.

USER DATA:
- Total past bookings: ${userLockers.length}
- Preferred locker numbers: ${userLockers.map(l => l.locker_number).join(', ') || 'None'}
- Average rental duration: ${recentPayments.length > 0 ? 
  (recentPayments.reduce((sum, p) => sum + (p.rental_duration_hours || 24), 0) / recentPayments.length).toFixed(1) : 'N/A'} hours
- Recent booking frequency: ${userLockers.filter(l => {
  const bookingDate = new Date(l.booking_start || l.created_date);
  const daysSince = (Date.now() - bookingDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= 30;
}).length} bookings in last 30 days

GYM STATUS:
- Total lockers: ${allLockers.length}
- Available now: ${availableLockers.length}
- Currently claimed: ${claimedLockers.length}
- Occupancy rate: ${((claimedLockers.length / allLockers.length) * 100).toFixed(0)}%

CURRENT TIME: ${new Date().toLocaleString()}

Based on this data, provide:
1. Demand prediction: Is this a peak time? (High/Medium/Low demand expected)
2. Top 3 recommended locker numbers with brief reasoning (consider past preferences, availability, and patterns)
3. Optimal rental duration suggestion in hours
4. One personalized insight about the user's locker usage pattern

Return as JSON with this structure:
{
  "demand_level": "High|Medium|Low",
  "demand_reasoning": "Brief explanation",
  "recommendations": [
    {
      "locker_number": "string",
      "reason": "why this locker"
    }
  ],
  "optimal_duration_hours": number,
  "user_insight": "Personalized insight about their pattern"
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          demand_level: { type: "string" },
          demand_reasoning: { type: "string" },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                locker_number: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          optimal_duration_hours: { type: "number" },
          user_insight: { type: "string" }
        }
      }
    });

    // Filter recommendations to only available lockers
    const validRecommendations = response.recommendations.filter(rec => 
      availableLockers.some(l => l.locker_number === rec.locker_number)
    );

    return Response.json({
      ...response,
      recommendations: validRecommendations.length > 0 ? validRecommendations : response.recommendations.slice(0, 3),
      available_count: availableLockers.length,
      total_count: allLockers.length
    });

  } catch (error) {
    console.error('Locker recommendations error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});