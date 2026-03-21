/**
 * BottomSheet — Mobile-native replacement for dialogs, dropdowns, and modals.
 * On mobile: renders as a Vaul drawer sliding up from bottom.
 * On desktop: renders as a standard centered dialog.
 *
 * Usage:
 *   <BottomSheet open={open} onOpenChange={setOpen} title="Select Option">
 *     <YourContent />
 *   </BottomSheet>
 */
import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  showCloseButton = true,
  snapPoints,
  className = '',
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} snapPoints={snapPoints}>
        <DrawerContent
          className={`bg-card border-border focus:outline-none ${className}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {title && (
            <DrawerHeader className="flex items-center justify-between pb-2">
              <DrawerTitle className="text-foreground font-mono text-sm uppercase tracking-wide text-left">
                {title}
              </DrawerTitle>
              {showCloseButton && (
                <DrawerClose asChild>
                  <button
                    aria-label="Close"
                    className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </DrawerClose>
              )}
            </DrawerHeader>
          )}
          <div className="scroll-container max-h-[70vh] px-4 pb-4">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`bg-card border-border ${className}`}>
        {title && (
          <DialogHeader>
            <DialogTitle className="text-foreground font-mono text-sm uppercase tracking-wide">
              {title}
            </DialogTitle>
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * BottomSheetSelect — Option picker rendered as a bottom sheet on mobile.
 * Drop-in replacement for <Select> + <MobileSelect>.
 */
export function BottomSheetSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  trigger,
  title,
}) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const handleSelect = (val) => {
    onValueChange(val);
    setOpen(false);
  };

  if (!isMobile) {
    // On desktop, just render the trigger as-is (it's already a Select)
    return trigger;
  }

  const selectedOption = options.find((o) => o.value === value);

  return (
    <>
      <div
        onClick={(e) => { e.preventDefault(); setOpen(true); }}
        className="cursor-pointer select-none"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
      >
        {trigger}
      </div>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={title || placeholder}
        showCloseButton
      >
        <div className="space-y-1 py-1">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center justify-between px-3 py-3.5 min-h-[52px] rounded-xl transition-colors text-left select-none
                ${value === option.value
                  ? 'bg-green-500/10 text-green-600 font-semibold'
                  : 'hover:bg-muted text-foreground'
                }`}
            >
              <div className="flex-1">
                <div className="font-mono text-sm">{option.label}</div>
                {option.subtitle && (
                  <div className="text-xs text-muted-foreground mt-0.5">{option.subtitle}</div>
                )}
              </div>
              {value === option.value && (
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center ml-3 flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}