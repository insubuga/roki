import { createContext, useContext, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const SESSION_KEY = 'roki_nav_stack';

function getPersistedStack() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistStack(stack) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(stack));
  } catch {}
}

const NavigationStackContext = createContext({
  direction: 1,
  stackDepth: 0,
  canGoBack: false,
  goBack: () => {},
});

export function NavigationStackProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Restore stack from session so back works after refresh
  const stackRef = useRef(getPersistedStack() || [location.pathname]);
  const [state, setState] = useState({
    direction: 1,
    stackDepth: stackRef.current.length - 1,
    canGoBack: stackRef.current.length > 1,
  });

  useEffect(() => {
    const stack = stackRef.current;
    const current = location.pathname;
    const prevIndex = stack.lastIndexOf(current);

    let newStack;
    let direction;

    if (prevIndex !== -1 && prevIndex < stack.length - 1) {
      // Navigating back to a previously visited page
      direction = -1;
      newStack = stack.slice(0, prevIndex + 1);
    } else if (stack[stack.length - 1] === current) {
      // Same page — no change
      return;
    } else {
      // Forward navigation
      direction = 1;
      newStack = [...stack, current];
    }

    stackRef.current = newStack;
    persistStack(newStack);
    setState({
      direction,
      stackDepth: newStack.length - 1,
      canGoBack: newStack.length > 1,
    });
  }, [location.pathname]);

  const goBack = useCallback(() => {
    const stack = stackRef.current;
    if (stack.length > 1) {
      navigate(stack[stack.length - 2], { replace: false });
    } else {
      navigate('/');
    }
  }, [navigate]);

  return (
    <NavigationStackContext.Provider value={{ ...state, goBack }}>
      {children}
    </NavigationStackContext.Provider>
  );
}

export const useNavigationDirection = () => useContext(NavigationStackContext);
export const useNavigation = () => useContext(NavigationStackContext);