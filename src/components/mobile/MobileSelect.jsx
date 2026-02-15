import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

export default function MobileSelect({ options, value, onValueChange, placeholder, trigger }) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (!isMobile) {
    // On desktop, render the regular trigger
    return trigger;
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="cursor-pointer select-none">
        {React.cloneElement(trigger, { 
          onClick: (e) => {
            e.preventDefault();
            setOpen(true);
          }
        })}
      </div>
      <DrawerContent className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
        <DrawerHeader>
          <DrawerTitle className="text-[var(--color-text-primary)]">{placeholder}</DrawerTitle>
        </DrawerHeader>
        <div className="max-h-[60vh] overflow-y-auto px-4 pb-safe">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onValueChange(option.value);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors select-none"
            >
              <div className="flex-1 text-left">
                <div className="text-[var(--color-text-primary)] font-medium">{option.label}</div>
                {option.subtitle && (
                  <div className="text-sm text-[var(--color-text-secondary)] mt-1">{option.subtitle}</div>
                )}
              </div>
              {value === option.value && (
                <Check className="w-5 h-5 text-[var(--color-primary)] ml-3 select-none flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-[var(--color-border)]">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full select-none">
              Cancel
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}