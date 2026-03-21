import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Scheduled automation to enforce data retention & compliance policies.
 * Runs daily to archive/delete expired audit logs.
 * Kept intentionally lean to stay within CPU and credit limits.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    console.log('[COMPLIANCE] Enforcing retention policies...');

    const now = new Date().toISOString();

    // Fetch expired logs — limit to 200 per run to avoid CPU timeout
    const expiredLogs = await base44.asServiceRole.entities.AuditLog.filter({
      retention_until: { $lt: now }
    }, 'retention_until', 200);

    console.log(`[COMPLIANCE] Found ${expiredLogs.length} expired log entries`);

    const gdprLogs = expiredLogs.filter(l => l.compliance_flags?.includes('GDPR'));
    const otherLogs = expiredLogs.filter(l => !l.compliance_flags?.includes('GDPR'));

    // Delete GDPR logs in parallel (batched)
    const deleteResults = await Promise.allSettled(
      gdprLogs.map(log => base44.asServiceRole.entities.AuditLog.delete(log.id))
    );
    const deleted = deleteResults.filter(r => r.status === 'fulfilled').length;

    // Anonymize non-GDPR logs in parallel (batched)
    const updateResults = await Promise.allSettled(
      otherLogs.map(log => base44.asServiceRole.entities.AuditLog.update(log.id, {
        ip_address: 'ARCHIVED',
        user_agent: 'ARCHIVED',
        actor_email: 'ARCHIVED'
      }))
    );
    const archived = updateResults.filter(r => r.status === 'fulfilled').length;

    const deleteFailures = deleteResults.filter(r => r.status === 'rejected').length;
    const updateFailures = updateResults.filter(r => r.status === 'rejected').length;

    console.log(`[COMPLIANCE] Deleted: ${deleted}, Archived: ${archived}, Failures: ${deleteFailures + updateFailures}`);

    return Response.json({
      success: true,
      archived,
      deleted,
      failures: deleteFailures + updateFailures,
      processed: expiredLogs.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[COMPLIANCE] Enforcement failed: ${error.message}`);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});