import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Hook for optimistic UI updates with automatic rollback on failure
 * @param {string} queryKey - React Query key to update
 * @param {function} updateFn - Async function that performs the update
 * @returns {object} { isPending, execute }
 */
export function useOptimisticUpdate(queryKey, updateFn) {
  const [isPending, setIsPending] = useState(false);
  const queryClient = useQueryClient();

  const execute = useCallback(
    async (oldData, newData, successMessage = 'Updated') => {
      setIsPending(true);
      
      // Optimistic update
      queryClient.setQueryData(queryKey, newData);

      try {
        const result = await updateFn(newData);
        toast.success(successMessage);
        queryClient.invalidateQueries({ queryKey });
        return result;
      } catch (error) {
        // Rollback on error
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