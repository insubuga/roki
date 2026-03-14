import { useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Hook to render a confirmation dialog and return a promise
 * @returns {object} { confirm, Dialog }
 */
export function useConfirmDialog() {
  const [state, setState] = useState({
    open: false,
    title: '',
    description: '',
    actionText: 'Confirm',
    isDangerous: false,
    resolve: null,
  });

  const confirm = useCallback(
    (title, description, actionText = 'Confirm', isDangerous = false) => {
      return new Promise((resolve) => {
        setState({
          open: true,
          title,
          description,
          actionText,
          isDangerous,
          resolve,
        });
      });
    },
    []
  );

  const Dialog = () => (
    <AlertDialog open={state.open} onOpenChange={(open) => {
      if (!open) {
        state.resolve?.(false);
        setState(prev => ({ ...prev, open: false }));
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          <AlertDialogDescription>{state.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              state.resolve?.(true);
              setState(prev => ({ ...prev, open: false }));
            }}
            className={state.isDangerous ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {state.actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, Dialog };
}