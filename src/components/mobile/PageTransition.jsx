import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigationDirection } from '@/lib/NavigationStack';

const DURATION = 0.22;
const DISTANCE = 40; // px — subtle, not full-screen, feels native

export default function PageTransition({ children, pageKey }) {
  const { direction } = useNavigationDirection();

  const variants = {
    enter: { opacity: 0, x: direction * DISTANCE },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction * -DISTANCE },
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: DURATION, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full"
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}