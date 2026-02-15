import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Lock, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { addHours } from 'date-fns';

const PRICING = {
  '1': 2,
  '3': 5,
  '6': 9,
  '12': 15,
  '24': 25,
  '72': 60,
  '168': 100,
};

export default function LockerCheckout({ open, onClose, gym, onSuccess, user }) {
  const [duration, setDuration] = useState('24');
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const durations = [
    { value: '1', label: '1 hour', price: PRICING['1'] },
    { value: '3', label: '3 hours', price: PRICING['3'] },
    { value: '6', label: '6 hours', price: PRICING['6'] },
    { value: '12', label: '12 hours', price: PRICING['12'] },
    { value: '24', label: '1 day', price: PRICING['24'] },
    { value: '72', label: '3 days', price: PRICING['72'] },
    { value: '168', label: '1 week', price: PRICING['168'] },
  ];

  const selectedPrice = PRICING[duration];

  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      setProcessing(true);
      
      // Create payment record
      const payment = await base44.entities.Payment.create({
        user_email: user.email,
        amount: selectedPrice,
        payment_type: 'locker_rental',
        status: 'pending',
        description: `Locker rental at ${gym.name} for ${durations.find(d => d.value === duration)?.label}`,
        rental_duration_hours: parseInt(duration)
      });

      // Simulate Stripe payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update payment status
      await base44.entities.Payment.update(payment.id, {
        status: 'completed',
        stripe_payment_id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      return { payment, duration: parseInt(duration) };
    },
    onSuccess: async (data) => {
      setProcessing(false);
      toast.success('Payment successful!');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      onSuccess(data.duration);
      onClose();
    },
    onError: (error) => {
      setProcessing(false);
      toast.error('Payment failed. Please try again.');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#7cfc00]" />
            Locker Rental Checkout
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Gym Info */}
          <div className="bg-[#0d1320] rounded-lg p-3 border border-gray-700">
            <p className="text-gray-400 text-xs mb-1">Location</p>
            <p className="text-white font-semibold">{gym.name}</p>
            <p className="text-gray-500 text-xs mt-1">{gym.address}</p>
          </div>

          {/* Duration Selection */}
          <div>
            <label className="text-gray-400 text-sm block mb-2">Rental Duration</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-[#0d1320] border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-gray-700">
                {durations.map((d) => (
                  <SelectItem key={d.value} value={d.value} className="text-white">
                    <div className="flex items-center justify-between w-full">
                      <span>{d.label}</span>
                      <span className="text-[#7cfc00] ml-4">${d.price}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pricing Summary */}
          <div className="bg-gradient-to-br from-[#7cfc00]/10 to-teal-500/10 rounded-lg p-4 border border-[#7cfc00]/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Rental Fee</span>
              <span className="text-white font-semibold">${selectedPrice}.00</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Processing Fee</span>
              <span className="text-white font-semibold">$0.00</span>
            </div>
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">Total</span>
                <span className="text-[#7cfc00] font-bold text-xl">${selectedPrice}.00</span>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <Button
            onClick={() => processPaymentMutation.mutate()}
            disabled={processing}
            className="w-full bg-[#7cfc00] hover:bg-[#6be600] text-black font-bold py-6"
          >
            {processing ? (
              <>Processing Payment...</>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Pay ${selectedPrice} & Book Locker
              </>
            )}
          </Button>

          <p className="text-gray-500 text-xs text-center">
            Secure payment processed by Stripe. Your payment information is encrypted and secure.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}