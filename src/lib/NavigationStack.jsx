import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';

// Direction: 1=forward (push), -1=back (pop), 0=replace/tab-switch
const NavigationStackContext = createContext({ direction: 1, canGoBack: false, goBack: () => {} });

export function NavigationStackProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navType = useNavigationType(); // 'PUSH' | 'POP' | 'REPLACE' — from react-router

  const stackRef = useRef([location.pathname]);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const current = location.pathname;
    const stack = stackRef.current;
    const top = stack[stack.length - 1];

    if (top === current) return; // same page, skip

    if (navType === 'POP') {
      // Browser back button or navigate(-1)
      const prevIndex = stack.lastIndexOf(current);
      if (prevIndex !== -1) {
        stackRef.current = stack.slice(0, prevIndex + 1);
        setDirection(-1);
      } else {
        // Forward via browser forward button (not in our stack)
        stackRef.current = [...stack, current];
        setDirection(1);
      }
    } else if (navType === 'REPLACE') {
      // Tab switch / replace — treat as neutral (no slide)
      stackRef.current = [...stack.slice(0, -1), current];
      setDirection(0);
    } else {
      // PUSH — normal forward link navigation
      stackRef.current = [...stack, current];
      setDirection(1);
    }
  }, [location.pathname, navType]);

  const goBack = useCallback(() => {
    if (stackRef.current.length > 1) {
      navigate(-1);
    } else {
      navigate('/Dashboard', { replace: true });
    }
  }, [navigate]);

  const canGoBack = stackRef.current.length > 1;

  return (
    <NavigationStackContext.Provider value={{ direction, canGoBack, goBack }}>
      {children}
    </NavigationStackContext.Provider>
  );
}

export const useNavigationDirection = () => useContext(NavigationStackContext);
export const useNavigation = () => useContext(NavigationStackContext);