import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const REFRESH_THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isPulling = useRef(false);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current || isRefreshing) return;
    const pull = Math.max(0, e.touches[0].clientY - touchStartY.current);
    if (window.scrollY > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }
    if (pull > 0) {
      setPullDistance(Math.min(pull * 0.5, REFRESH_THRESHOLD * 1.4));
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    const current = pullDistance;
    if (current >= REFRESH_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / REFRESH_THRESHOLD, 1);
  const indicatorHeight = isRefreshing ? 48 : pullDistance > 0 ? pullDistance : 0;

  return (
    <div className="relative">
      {/* Pull indicator — no layout shift, no nested scroll container */}
      <div
        className="flex items-center justify-center pointer-events-none select-none overflow-hidden transition-all"
        style={{ height: indicatorHeight, opacity: isRefreshing ? 1 : progress }}
      >
        <RefreshCw
          className={`w-5 h-5 text-green-500 ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)` }}
        />
      </div>
      {children}
    </div>
  );
}