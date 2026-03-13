import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Process geofence entry/exit events
 * Triggers locker activation, route assignment, notifications
 * 
 * Called from mobile app when user enters gym proximity
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      user_latitude,
      user_longitude,
      gym_id,
      gps_accuracy_meters = 20
    } = await req.json();

    if (!gym_id || user_latitude === undefined || user_longitude === undefined) {
      return Response.json({
        error: 'Missing required fields: gym_id, user_latitude, user_longitude'
      }, { status: 400 });
    }

    // Get gym and geofence data
    const gym = await base44.entities.Gym.get(gym_id);
    const geofences = await base44.entities.GymGeofence.filter({ gym_id });
    const geofence = geofences[0];

    if (!geofence || !geofence.is_active) {
      return Response.json({
        event: 'geofence_inactive',
        message: 'Geofence not active for this gym'
      });
    }

    // Calculate distance
    const distance = calculateDistance(
      user_latitude,
      user_longitude,
      geofence.latitude,
      geofence.longitude
    );

    // Log location event
    await base44.entities.LocationEvent.create({
      user_email: user.email,
      event_type: 'location_update',
      gym_id,
      user_latitude,
      user_longitude,
      distance_meters: Math.round(distance),
      gps_accuracy_meters,
      timestamp: new Date().toISOString()
    });

    let action_triggered = null;
    let response_data = {
      distance_meters: Math.round(distance),
      gym_name: gym.name,
      is_inside_geofence: distance <= geofence.radius_meters
    };

    // Check if user entered geofence
    if (distance <= geofence.activation_distance_meters && gps_accuracy_meters <= 50) {
      // Get user's active cycle locker assignment
      const assignments = await base44.entities.CycleLockerAssignment.filter({
        user_id: user.email,
        status: 'softReserved'
      });

      if (assignments.length > 0) {
        const assignment = assignments[0];

        // Activate locker automatically
        await base44.entities.Locker.update(assignment.locker_id, {
          status: 'activated'
        });

        await base44.entities.CycleLockerAssignment.update(assignment.id, {
          status: 'activated',
          activated_at: new Date().toISOString()
        });

        action_triggered = 'locker_activated';

        // Send notification
        await base44.functions.invoke('sendNotification', {
          user_email: user.email,
          title: '🔓 Locker Activated',
          body: `Your locker at ${gym.name} is ready. Code: ${assignment.access_code}`
        });

        response_data.locker_activated = {
          locker_id: assignment.locker_id,
          locker_number: assignment.locker_number,
          access_code: assignment.access_code
        };
      }
    }

    // Log action
    if (action_triggered) {
      await base44.entities.LocationEvent.create({
        user_email: user.email,
        event_type: 'geofence_enter',
        gym_id,
        user_latitude,
        user_longitude,
        distance_meters: Math.round(distance),
        gps_accuracy_meters,
        timestamp: new Date().toISOString(),
        action_triggered
      });
    }

    console.log(`[GEOFENCE] ${user.email} at ${distance.toFixed(0)}m from ${gym.name}`);

    return Response.json({
      success: true,
      ...response_data,
      action_triggered
    });

  } catch (error) {
    console.error(`[GEOFENCE] Failed: ${error.message}`);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

/**
 * Haversine formula: calculate distance between two lat/lon points
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}