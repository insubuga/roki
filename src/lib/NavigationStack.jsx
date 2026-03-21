import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';

// Direction: 1=forward (push), -1=back (pop), 0=replace/tab-switch
const NavigationStackContext = createContext({ direction: 1, canGoBack: false, goBack: () => {} });

export function NavigationStackProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  // navType is sourced directly from React Router — guaranteed to be in sync with location changes
  const navType = useNavigationType(); // 'PUSH' | 'POP' | 'REPLACE'

  const stackRef = useRef([location.pathname]);
  const [direction, setDirection] = useState(1);
  // stackLength mirrors stackRef.current.length in state so canGoBack is reactive
  const [stackLength, setStackLength] = useState(1);

  useEffect(() => {
    const current = location.pathname;
    const stack = stackRef.current;
    const top = stack[stack.length - 1];

    // Deduplicate: if the top of the stack already matches, skip
    if (top === current) return;

    let nextStack;
    let nextDirection;

    if (navType === 'POP') {
      // Strict backward navigation — find the last occurrence in our stack
      const prevIndex = stack.lastIndexOf(current);
      if (prevIndex !== -1) {
        nextStack = stack.slice(0, prevIndex + 1);
        nextDirection = -1;
      } else {
        // Not in stack (e.g. browser forward button) — treat as forward
        nextStack = [...stack, current];
        nextDirection = 1;
      }
    } else if (navType === 'REPLACE') {
      // Tab switch or programmatic replace — neutral, no slide
      nextStack = [...stack.slice(0, -1), current];
      nextDirection = 0;
    } else {
      // PUSH — standard forward navigation
      nextStack = [...stack, current];
      nextDirection = 1;
    }

    stackRef.current = nextStack;
    setStackLength(nextStack.length);
    setDirection(nextDirection);
  // Both location.pathname AND navType must be in deps — React Router guarantees
  // they update atomically in the same render cycle.
  }, [location.pathname, navType]);

  // goBack: navigates back in the managed stack. Accepts an optional fallback route
  // if the stack is empty (first page load, direct URL access, etc.)
  const goBack = useCallback((fallback = '/Dashboard') => {
    if (stackRef.current.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  }, [navigate]);

  return (
    <NavigationStackContext.Provider value={{ direction, canGoBack: stackLength > 1, goBack }}>
      {children}
    </NavigationStackContext.Provider>
  );
}

export const useNavigationDirection = () => useContext(NavigationStackContext);
export const useNavigation = () => useContext(NavigationStackContext);