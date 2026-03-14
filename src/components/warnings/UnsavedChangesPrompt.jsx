import { useEffect } from 'react';

/**
 * Warn user before leaving page with unsaved changes
 */
export function useUnsavedChangesWarning(hasChanges) {
  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);
}