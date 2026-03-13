import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

/**
 * Log critical events to immutable audit trail
 * Called from other functions after sensitive operations
 * 
 * Usage:
 * await base44.functions.invoke('logAuditEvent', {
 *   event_type: 'entity_update',
 *   resource_type: 'cycle',
 *   resource_id: cycle_id,
 *   action: 'dropped_off',
 *   changes: { status: { from: 'awaiting_pickup', to: 'dropped' } },
 *   severity: 'info'
 * });
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const {
      event_type,
      resource_type,
      resource_id,
      actor_email,
      actor_role,
      action,
      changes = {},
      severity = 'info',
      status = 'success',
      error_message = null,
      compliance_flags = [],
      custom_request_id = null
    } = await req.json();

    // Validate required fields
    if (!event_type || !resource_type || !action) {
      return Response.json({
        error: 'Missing required fields: event_type, resource_type, action'
      }, { status: 400 });
    }

    // Get current user
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) {
      // Anonymous action or system operation
    }

    const actorEmail = actor_email || user?.email || 'system';
    const actorRole = actor_role || user?.role || 'system';

    // Determine retention based on compliance flags
    const baseRetentionDays = compliance_flags.includes('GDPR') ? 2555 : // 7 years
                              compliance_flags.includes('PCI') ? 2555 :   // 7 years
                              1825; // Default 5 years

    const retentionUntil = new Date();
    retentionUntil.setDate(retentionUntil.getDate() + baseRetentionDays);

    // Get request headers for audit context
    const headers = req.headers;
    const ipAddress = headers.get('x-forwarded-for') || 
                      headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = headers.get('user-agent') || 'unknown';
    const requestId = custom_request_id || headers.get('x-request-id') || uuidv4();

    // Create audit log entry
    const auditEntry = await base44.asServiceRole.entities.AuditLog.create({
      event_id: uuidv4(),
      event_type,
      actor_email: actorEmail,
      actor_role: actorRole,
      resource_type,
      resource_id,
      action,
      changes,
      timestamp: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      request_id: requestId,
      compliance_flags,
      severity,
      status,
      error_message,
      retention_until: retentionUntil.toISOString()
    });

    console.log(`[AUDIT] ${event_type}: ${actorEmail} → ${resource_type}#${resource_id} (${action})`);

    return Response.json({
      success: true,
      audit_id: auditEntry.id,
      event_id: auditEntry.event_id,
      request_id: requestId
    });

  } catch (error) {
    console.error(`[AUDIT] Failed to log event: ${error.message}`);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});