import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigationDirection } from '@/lib/NavigationStack';

// Android Material 3 — Shared Axis Horizontal
// Forward: new page slides in from right (+48px), old fades/slides left
// Back:    new page slides in from left (-48px), old fades/slides right
// Replace: simple fade (tab switch, no slide)

const SLIDE_PX = 48;
const ENTER_EASE = [0.2, 0.0, 0.0, 1.0];   // decelerate (Material standard enter)
const EXIT_EASE  = [0.4, 0.0, 1.0, 1.0];   // accelerate (Material standard exit)
const ENTER_DURATION = 0.28;
const EXIT_DURATION  = 0.2;

export default function PageTransition({ children, pageKey }) {
  const { direction } = useNavigationDirection();

  // direction 0 = tab switch → pure fade, no translate
  const enterX = direction === 0 ? 0 : direction > 0 ?  SLIDE_PX : -SLIDE_PX;
  const exitX  = direction === 0 ? 0 : direction > 0 ? -SLIDE_PX :  SLIDE_PX;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        initial={{ x: enterX, opacity: 0 }}
        animate={{
          x: 0,
          opacity: 1,
          transition: { duration: ENTER_DURATION, ease: ENTER_EASE },
        }}
        exit={{
          x: exitX,
          opacity: 0,
          transition: { duration: EXIT_DURATION, ease: EXIT_EASE },
        }}
        className="w-full"
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}