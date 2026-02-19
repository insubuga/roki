import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'driver' && user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden: Driver access required' }, { status: 403 });
    }

    const { start, end } = await req.json();

    if (!start || !end || start.length !== 2 || end.length !== 2) {
      return Response.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const MAPBOX_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    if (!MAPBOX_TOKEN) {
      console.error('MAPBOX_ACCESS_TOKEN not set');
      return Response.json({ error: 'Map service not configured' }, { status: 500 });
    }

    // Fetch route from Mapbox Directions API
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&steps=true&access_token=${MAPBOX_TOKEN}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Mapbox API error:', await response.text());
      return Response.json({ error: 'Failed to fetch route' }, { status: 500 });
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return Response.json({ error: 'No route found' }, { status: 404 });
    }

    const route = data.routes[0];
    
    // Convert GeoJSON coordinates to Leaflet format [lat, lng]
    const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
    
    // Extract turn-by-turn steps
    const steps = route.legs[0].steps.map(step => ({
      instruction: step.maneuver.instruction,
      distance: step.distance,
      duration: step.duration,
      type: step.maneuver.type
    }));

    return Response.json({
      route: routeCoordinates,
      steps: steps,
      distance: route.distance, // in meters
      duration: route.duration  // in seconds
    });

  } catch (error) {
    console.error('Route function error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});