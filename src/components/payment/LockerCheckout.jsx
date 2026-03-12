import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, Lock, MapPin, Clock, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const DURATIONS = [
  { value: '1',   label: '1 hour',  price: 2  },
  { value: '3',   label: '3 hours', price: 5  },
  { value: '6',   label: '6 hours', price: 9  },
  { value: '12',  label: '12 hours',price: 15 },
  { value: '24',  label: '1 day',   price: 25 },
  { value: '72',  label: '3 days',  price: 60 },
  { value: '168', label: '1 week',  price: 100},
];

export default function LockerCheckout({ open, onClose, gym, user, onBookingComplete }) {
  const [duration, setDuration] = useState('24');
  const [processing, setProcessing] = useState(false);

  const selected = DURATIONS.find(d => d.value === duration) || DURATIONS[4];

  const handleCheckout = async () => {
    if (!gym) {
      toast.error('Please select a gym first');
      return;
    }

    // Block in iframe/preview
    if (window.self !== window.top) {
      toast.error('Checkout only works in the published app, not preview mode.');
      return;
    }

    setProcessing(true);

    // Store booking intent in sessionStorage so we can claim locker on return
    sessionStorage.setItem('pendingLockerBooking', JSON.stringify({
      gymKey: `${gym.name}_${gym.address}`,
      gymName: gym.name,
      gymAddress: gym.address,
      duration: duration,
    }));

    const response = await base44.functions.invoke('createCheckoutSession', {
      duration: duration,
      gym_name: gym.name,
      gym_address: gym.address,
    });

    if (response.data?.url) {
      window.location.href = response.data.url;
    } else {
      setProcessing(false);
      toast.error('Could not start checkout. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-600/20 flex items-center justify-center">
              <Lock className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-foreground font-mono font-bold text-sm uppercase tracking-wider">Locker Booking</h2>
              <p className="text-muted-foreground font-mono text-xs">Secure rental checkout</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Gym Info */}
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-foreground font-mono font-semibold text-sm">{gym?.name || 'Selected Gym'}</p>
                {gym?.address && (
                  <p className="text-muted-foreground font-mono text-xs mt-0.5">{gym.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-muted-foreground font-mono text-xs uppercase tracking-wider block mb-2">
              Rental Duration
            </label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-muted border-border text-foreground font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value} className="text-foreground font-mono">
                    <div className="flex items-center justify-between w-full gap-8">
                      <span className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {d.label}
                      </span>
                      <span className="text-green-600 font-bold">${d.price}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pricing Summary */}
          <div className="bg-green-600/5 border border-green-600/20 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-mono">Rental Fee</span>
              <span className="text-foreground font-mono font-semibold">${selected.price}.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-mono">Processing Fee</span>
              <span className="text-foreground font-mono font-semibold">$0.00</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="text-foreground font-mono font-bold">Total</span>
              <span className="text-green-600 font-mono font-bold text-lg">${selected.price}.00</span>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={handleCheckout}
            disabled={processing || !gym}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-mono font-bold h-12 text-sm"
          >
            {processing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Redirecting to checkout...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Pay ${selected.price} · Book Locker
              </span>
            )}
          </Button>

          <p className="text-muted-foreground font-mono text-xs text-center">
            Secured by Stripe · Encrypted & safe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}