import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Wrap any operation with automatic retry logic
 * Call this from other functions to handle transient failures gracefully
 * 
 * Usage in another function:
 * const result = await base44.functions.invoke('wrapWithRetry', {
 *   operation_type: 'cycle_drop',
 *   operation_payload: { cycle_id, locker_id, user_email },
 *   affected_entity_type: 'cycle',
 *   affected_entity_id: cycle_id,
 *   user_email: userEmail,
 *   max_attempts: 5,
 *   priority: 'high'
 * });
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const {
      operation_type,
      operation_payload,
      affected_entity_type,
      affected_entity_id,
      user_email,
      max_attempts = 5,
      priority = 'medium'
    } = await req.json();

    if (!operation_type || !operation_payload) {
      return Response.json({
        error: 'Missing required fields: operation_type, operation_payload'
      }, { status: 400 });
    }

    console.log(`[WRAP_RETRY] Executing ${operation_type} with retry wrapper`);

    // Try immediate execution first
    try {
      const result = await executeOperation(base44, operation_type, operation_payload);
      console.log(`[WRAP_RETRY] ✅ Operation succeeded immediately`);
      return Response.json({ success: true, result });

    } catch (error) {
      const isTransient = isTransientError(error);
      
      if (!isTransient) {
        // Permanent error → fail immediately
        console.error(`[WRAP_RETRY] ❌ Permanent error: ${error.message}`);
        return Response.json({
          success: false,
          error: error.message,
          transient: false
        }, { status: 500 });
      }

      // Transient error → queue for retry
      console.log(`[WRAP_RETRY] 🔄 Transient error detected, queuing for retry: ${error.message}`);

      const nextRetry = new Date(Date.now() + 60000); // Retry in 1 minute
      
      const retryOp = await base44.asServiceRole.entities.RetryableOperation.create({
        operation_type,
        status: 'pending',
        affected_entity_type,
        affected_entity_id,
        user_email,
        operation_payload,
        error_message: error.message,
        error_type: 'transient',
        attempt_count: 1,
        max_attempts,
        next_retry_at: nextRetry.toISOString(),
        priority
      });

      console.log(`[WRAP_RETRY] Queued retry operation: ${retryOp.id}`);

      return Response.json({
        success: false,
        error: error.message,
        transient: true,
        retry_queued: true,
        retry_operation_id: retryOp.id,
        next_retry_at: nextRetry.toISOString()
      }, { status: 202 }); // 202 Accepted - operation is queued
    }

  } catch (error) {
    console.error(`[WRAP_RETRY] Wrapper failed: ${error.message}`);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

/**
 * Execute operation based on type
 */
async function executeOperation(base44, operationType, payload) {
  switch (operationType) {
    case 'cycle_drop':
      return await base44.asServiceRole.functions.invoke('atomicCycleDrop', payload);
    
    case 'locker_assignment':
      return await base44.asServiceRole.entities.CycleLockerAssignment.create(payload);
    
    case 'subscription_checkout':
      return await base44.asServiceRole.functions.invoke('createSubscriptionCheckout', payload);
    
    default:
      throw new Error(`Unknown operation type: ${operationType}`);
  }
}

/**
 * Classify error as transient (retry-able) or permanent
 */
function isTransientError(error) {
  const msg = error.message?.toLowerCase() || '';
  
  // Transient errors
  const transientPatterns = [
    'timeout',
    'econnrefused',
    'econnreset',
    'network',
    'temporarily',
    'unavailable',
    '503',
    '429',
    'rate limit'
  ];

  return transientPatterns.some(pattern => msg.includes(pattern));
}