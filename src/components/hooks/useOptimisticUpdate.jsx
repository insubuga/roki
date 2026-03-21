import { useState, useCallback, useRef } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * useOptimisticUpdate — Instant UI feedback with automatic rollback on failure.
 * @param {string|string[]} queryKey - React Query key(s) to update
 * @param {function} updateFn - Async function that performs the actual update
 * @returns {object} { isPending, execute }
 */
export function useOptimisticUpdate(queryKey, updateFn) {
  const [isPending, setIsPending] = useState(false);
  const queryClient = useQueryClient();

  const execute = useCallback(
    async (oldData, newData, successMessage = null) => {
      setIsPending(true);
      
      // Apply optimistic update immediately — zero latency
      queryClient.setQueryData(queryKey, newData);

      try {
        const result = await updateFn(newData);
        if (successMessage) toast.success(successMessage);
        // Reconcile with server truth
        queryClient.invalidateQueries({ queryKey });
        return result;
      } catch (error) {
        // Instant rollback on failure
        queryClient.setQueryData(queryKey, oldData);
        toast.error(error.message || 'Update failed');
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [queryKey, updateFn, queryClient]
  );

  return { isPending, execute };
}

/**
 * useOptimisticMutation — Wraps useMutation with optimistic list/object updates.
 * Ideal for toggling, status changes, and field updates on entity lists.
 *
 * @param {object} options
 * @param {string|string[]} options.queryKey   - Query to update optimistically
 * @param {function} options.mutationFn        - Async mutation function
 * @param {function} options.optimisticUpdate  - (oldData, variables) => newData
 * @param {string}   [options.successMessage]  - Toast on success (optional)
 * @param {function} [options.onSuccess]       - Called after server confirms
 */
export function useOptimisticMutation({
  queryKey,
  mutationFn,
  optimisticUpdate,
  successMessage = null,
  onSuccess,
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any in-flight refetches so they don't overwrite optimistic state
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      // Apply optimistic update immediately
      if (optimisticUpdate) {
        queryClient.setQueryData(queryKey, (old) => optimisticUpdate(old, variables));
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error('Update failed — changes reverted');
    },
    onSuccess: (data, variables, context) => {
      if (successMessage) toast.success(successMessage);
      onSuccess?.(data, variables, context);
    },
    onSettled: () => {
      // Always reconcile with server
      queryClient.invalidateQueries({ queryKey });
    },
  });
}