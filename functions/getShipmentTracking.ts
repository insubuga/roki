import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SHIPPO_API_KEY = Deno.env.get('SHIPPO_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tracking_number, carrier } = await req.json();

    if (!tracking_number || !carrier) {
      return Response.json({ error: 'Missing tracking_number or carrier' }, { status: 400 });
    }

    // Call Shippo tracking API
    const response = await fetch(`https://api.goshippo.com/tracks/${carrier}/${tracking_number}`, {
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Shippo API error:', response.status, await response.text());
      return Response.json({ 
        error: 'Failed to fetch tracking info',
        status: response.status 
      }, { status: 500 });
    }

    const trackingData = await response.json();

    // Transform Shippo response to our format
    return Response.json({
      tracking_number: trackingData.tracking_number,
      carrier: trackingData.carrier,
      status: trackingData.tracking_status?.status || 'UNKNOWN',
      status_details: trackingData.tracking_status?.status_details || '',
      eta: trackingData.eta,
      location: trackingData.tracking_status?.location,
      tracking_history: (trackingData.tracking_history || []).map(event => ({
        status: event.status,
        status_details: event.status_details,
        location: event.location?.city || event.location?.state || 'Unknown',
        timestamp: event.status_date,
      })),
    });
  } catch (error) {
    console.error('Tracking error:', error);
    return Response.json({ 
      error: 'Failed to retrieve tracking information',
      details: error.message 
    }, { status: 500 });
  }
});