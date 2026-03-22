import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Helper function: Log any operation failure to IncidentLog
 * Call this from catch blocks in other functions
 * 
 * Usage:
 * const result = await base44.functions.invoke('logOperationFailure', {
 *   incident_type: 'cycle_drop_failed',
 *   severity: 'high',
 *   affected_entity_type: 'cycle',
 *   affected_entity_id: cycleId,
 *   user_email: userEmail,
 *   error_message: error.message
 * });
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const {
      incident_type,
      severity,
      affected_entity_type,
      affected_entity_id,
      user_email,
      error_message,
      detection_method = 'automated_monitoring'
    } = await req.json();

    if (!incident_type || !affected_entity_type || !affected_entity_id) {
      return Response.json({
        error: 'Missing required fields: incident_type, affected_entity_type, affected_entity_id'
      }, { status: 400 });
    }

    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const incident = await base44.asServiceRole.entities.IncidentLog.create({
      incident_id: incidentId,
      incident_type,
      severity: severity || 'medium',
      affected_entity_type,
      affected_entity_id,
      user_email: user_email || 'system',
      incident_time: new Date().toISOString(),
      detection_method,
      root_cause: error_message,
      status: 'open',
      impact_score: severity === 'critical' ? 100 : severity === 'high' ? 75 : 50
    });

    console.log(`[LOG_FAILURE] Created incident ${incidentId} (type=${incident_type}, severity=${severity})`);

    return Response.json({
      success: true,
      incident_id: incidentId,
      created_at: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[LOG_FAILURE] Failed to log incident: ${error.message}`);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});