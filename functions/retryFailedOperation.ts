import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Retry a failed operation with exponential backoff
 * Called by monitorRetryQueue automation every 2 minutes
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    console.log('[RETRY_OPS] Starting failed operation retry monitor...');

    // Get all pending retries sorted by priority
    const pendingOps = await base44.asServiceRole.entities.RetryableOperation.filter({
      status: { $in: ['pending', 'retrying'] }
    }, '-priority', 100);

    console.log(`[RETRY_OPS] Found ${pendingOps.length} operations waiting for retry`);

    let succeeded = 0;
    let escalated = 0;
    let rescheduled = 0;

    for (const op of pendingOps) {
      // Check if it's time to retry
      const nextRetryTime = new Date(op.next_retry_at || op.created_date);
      if (nextRetryTime > new Date()) {
        console.log(`[RETRY_OPS] Op ${op.id} not ready yet (retry at ${nextRetryTime.toISOString()})`);
        continue;
      }

      console.log(`[RETRY_OPS] Attempting retry #${op.attempt_count + 1} for op ${op.id}`);

      try {
        // Attempt to re-execute the operation
        const result = await executeRetryableOperation(base44, op);
        
        // Mark as succeeded
        await base44.asServiceRole.entities.RetryableOperation.update(op.id, {
          status: 'succeeded',
          attempt_count: op.attempt_count + 1
        });
        
        console.log(`[RETRY_OPS] ✅ Op ${op.id} succeeded on attempt ${op.attempt_count + 1}`);
        succeeded++;

      } catch (retryError) {
        const newAttempt = op.attempt_count + 1;
        const isTransient = retryError.message?.includes('timeout') || 
                           retryError.message?.includes('network') ||
                           retryError.message?.includes('ECONNREFUSED');

        console.log(`[RETRY_OPS] ❌ Op ${op.id} failed on attempt ${newAttempt}: ${retryError.message}`);

        if (newAttempt < op.max_attempts && isTransient) {
          // Schedule next retry with exponential backoff: 1min, 2min, 4min, 8min...
          const backoffMs = Math.min(60000 * Math.pow(2, newAttempt - 1), 3600000); // Max 1 hour
          const nextRetry = new Date(Date.now() + backoffMs);

          await base44.asServiceRole.entities.RetryableOperation.update(op.id, {
            status: 'retrying',
            attempt_count: newAttempt,
            next_retry_at: nextRetry.toISOString(),
            error_message: retryError.message,
            error_type: 'transient'
          });

          console.log(`[RETRY_OPS] 🔄 Rescheduled op ${op.id} for retry in ${Math.round(backoffMs / 1000)}s`);
          rescheduled++;

        } else {
          // Max attempts exceeded or permanent error → escalate
          await base44.asServiceRole.entities.RetryableOperation.update(op.id, {
            status: 'manual_review',
            attempt_count: newAttempt,
            error_message: retryError.message,
            error_type: isTransient ? 'transient' : 'permanent',
            escalation_notes: `Failed after ${newAttempt} attempts. Error: ${retryError.message}`
          });

          // Log as incident for visibility
          await base44.asServiceRole.functions.invoke('logOperationFailure', {
            incident_type: 'operation_exhausted_retries',
            severity: op.priority === 'critical' ? 'critical' : 'high',
            affected_entity_type: op.affected_entity_type,
            affected_entity_id: op.affected_entity_id,
            user_email: op.user_email,
            error_message: `Operation exhausted ${newAttempt} retry attempts`
          });

          console.log(`[RETRY_OPS] 🚨 Op ${op.id} escalated to manual review`);
          escalated++;
        }
      }
    }

    console.log(`[RETRY_OPS] ✅ Complete. Succeeded: ${succeeded}, Rescheduled: ${rescheduled}, Escalated: ${escalated}`);

    return Response.json({
      success: true,
      total_ops: pendingOps.length,
      succeeded,
      rescheduled,
      escalated,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[RETRY_OPS] ❌ Failed: ${error.message}`);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

/**
 * Execute the original operation based on type
 * Add more operation types as needed
 */
async function executeRetryableOperation(base44, op) {
  const { operation_type, operation_payload } = op;

  switch (operation_type) {
    case 'cycle_drop':
      return await base44.asServiceRole.functions.invoke('atomicCycleDrop', operation_payload);
    
    case 'locker_assignment':
      return await base44.asServiceRole.entities.CycleLockerAssignment.create(operation_payload);
    
    case 'subscription_checkout':
      return await base44.asServiceRole.functions.invoke('createSubscriptionCheckout', operation_payload);
    
    case 'route_assignment':
      return await base44.asServiceRole.entities.Route.create(operation_payload);
    
    default:
      throw new Error(`Unknown operation type: ${operation_type}`);
  }
}