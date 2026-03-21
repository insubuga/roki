import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Handles Android hardware back button presses via the History API popstate event.
 * Pushes a dummy history entry on mount so the back button triggers popstate
 * instead of exiting the app. On popstate, navigates back in the React router stack.
 */
export default function AndroidBackHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Push a sentinel state so the back button fires popstate instead of exiting
    window.history.pushState({ androidBackHandled: true }, '');

    const handlePopState = (e) => {
      // Re-push sentinel so subsequent back presses are also caught
      window.history.pushState({ androidBackHandled: true }, '');
      navigate(-1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname]); // re-register on route change

  return null;
}