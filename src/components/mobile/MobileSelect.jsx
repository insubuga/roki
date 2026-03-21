import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function MobileSelect({ options, value, onValueChange, placeholder, trigger }) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!isMobile) {
    return trigger;
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <div
        onClick={(e) => { e.preventDefault(); setOpen(true); }}
        className="cursor-pointer select-none"
      >
        {trigger}
      </div>
      <DrawerContent className="bg-card border-border">
        <DrawerHeader>
          <DrawerTitle className="text-foreground font-mono text-sm uppercase tracking-wide">
            {placeholder}
          </DrawerTitle>
        </DrawerHeader>
        <div
          className="max-h-[60vh] overflow-y-auto px-4"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => { onValueChange(option.value); setOpen(false); }}
              className="w-full flex items-center justify-between p-4 min-h-[52px] hover:bg-muted rounded-lg transition-colors select-none text-left"
              aria-label={option.label}
            >
              <div className="flex-1">
                <div className="text-foreground font-medium font-mono">{option.label}</div>
                {option.subtitle && (
                  <div className="text-sm text-muted-foreground mt-0.5">{option.subtitle}</div>
                )}
              </div>
              {value === option.value && (
                <Check className="w-5 h-5 text-green-500 ml-3 flex-shrink-0" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-border">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full font-mono min-h-[44px]">
              Cancel
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}