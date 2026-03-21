import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Handles Android hardware back button presses via the History API popstate event.
 * Pushes a dummy history entry on mount so the back button triggers popstate
 * instead of exiting the app. On popstate, navigates back in the React router stack.
 */
export default function AndroidBackHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Push a single sentinel state once on mount so the Android back button
    // fires popstate instead of exiting the app.
    window.history.pushState({ androidBackHandled: true }, '');

    const handlePopState = (e) => {
      // Only handle our sentinel — ignore browser-native pops
      if (e.state?.androidBackHandled) {
        navigate(-1);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // mount-only — re-registering on every route change caused the pushState loop

  return null;
}