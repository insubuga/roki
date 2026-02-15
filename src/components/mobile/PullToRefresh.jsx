import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);
  const refreshThreshold = 80;

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return;

    const touchY = e.touches[0].clientY;
    const pull = Math.max(0, touchY - touchStartY.current);
    
    if (pull > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(pull, refreshThreshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= refreshThreshold && !isRefreshing) {
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
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, isRefreshing]);

  const rotation = (pullDistance / refreshThreshold) * 360;
  const opacity = Math.min(pullDistance / refreshThreshold, 1);

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      {/* Pull indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all pointer-events-none select-none"
        style={{ 
          height: `${pullDistance}px`,
          opacity: opacity
        }}
      >
        <RefreshCw 
          className={`w-6 h-6 text-[var(--color-primary)] select-none ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transition: isRefreshing ? 'none' : 'transform 0.2s'
          }}
        />
      </div>
      
      {/* Content */}
      <div 
        style={{ 
          transform: `translateY(${isRefreshing ? '60px' : pullDistance > 0 ? `${pullDistance}px` : '0'})`,
          transition: isRefreshing || !isPulling ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}