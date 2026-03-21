import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigationDirection } from '@/lib/NavigationStack';

// iOS-native feel: forward = slide in from right, back = slide in from left with parallax
const DURATION = 0.32;
const SPRING = { type: 'tween', duration: DURATION, ease: [0.32, 0.72, 0, 1] };

export default function PageTransition({ children, pageKey }) {
  const { direction } = useNavigationDirection();

  const variants = {
    // Entering page: slides in from right (forward) or left (back)
    enter: (dir) => ({
      x: dir > 0 ? '100%' : '-28%',
      opacity: dir > 0 ? 1 : 0.6,
      zIndex: dir > 0 ? 2 : 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      zIndex: 1,
    },
    // Exiting page: slides out to left (forward) or right (back) with parallax
    exit: (dir) => ({
      x: dir > 0 ? '-28%' : '100%',
      opacity: dir > 0 ? 0.6 : 1,
      zIndex: dir > 0 ? 0 : 2,
    }),
  };

  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={pageKey}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={SPRING}
        className="w-full"
        style={{ willChange: 'transform, opacity', position: 'relative' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}