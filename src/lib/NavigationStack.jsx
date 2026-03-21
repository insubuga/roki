import { createContext, useContext, useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const NavigationStackContext = createContext({ direction: 1 });

export function NavigationStackProvider({ children }) {
  const location = useLocation();
  const stackRef = useRef([location.pathname]);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  useEffect(() => {
    const stack = stackRef.current;
    const current = location.pathname;
    const prevIndex = stack.lastIndexOf(current);

    if (prevIndex !== -1 && prevIndex < stack.length - 1) {
      // Navigating back to a page we've seen — treat as "back"
      setDirection(-1);
      stackRef.current = stack.slice(0, prevIndex + 1);
    } else {
      // New page or tab switch — treat as "forward"
      setDirection(1);
      if (stack[stack.length - 1] !== current) {
        stackRef.current = [...stack, current];
      }
    }
  }, [location.pathname]);

  return (
    <NavigationStackContext.Provider value={{ direction }}>
      {children}
    </NavigationStackContext.Provider>
  );
}

export const useNavigationDirection = () => useContext(NavigationStackContext);