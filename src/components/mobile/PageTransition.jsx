import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

export default function PageTransition({ children, pageKey }) {
  const location = useLocation();
  const [direction, setDirection] = React.useState(0);
  const prevPath = React.useRef(location.pathname);

  React.useEffect(() => {
    // Determine slide direction based on navigation
    const mainPages = ['/Dashboard', '/LaundryOrder', '/Network', '/RiskRecovery', '/Configuration'];
    const currentIndex = mainPages.findIndex(p => location.pathname.includes(p));
    const prevIndex = mainPages.findIndex(p => prevPath.current.includes(p));
    
    if (currentIndex !== -1 && prevIndex !== -1) {
      setDirection(currentIndex > prevIndex ? 1 : -1);
    } else {
      // Child pages slide in from right
      setDirection(location.pathname.length > prevPath.current.length ? 1 : -1);
    }
    
    prevPath.current = location.pathname;
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={pageKey}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}