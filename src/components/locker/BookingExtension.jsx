import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { addHours, format } from 'date-fns';

export default function BookingExtension({ locker }) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState('');
  const queryClient = useQueryClient();

  const durations = [
    { value: '1', label: '1 hour' },
    { value: '3', label: '3 hours' },
    { value: '6', label: '6 hours' },
    { value: '12', label: '12 hours' },
    { value: '24', label: '1 day' },
    { value: '72', label: '3 days' },
    { value: '168', label: '1 week' },
  ];

  const extendBookingMutation = useMutation({
    mutationFn: async () => {
      const currentEnd = locker.booking_end ? new Date(locker.booking_end) : new Date();
      const newEnd = addHours(currentEnd, parseInt(duration));
      
      return base44.entities.Locker.update(locker.id, {
        booking_end: newEnd.toISOString()
      });
    },
    onSuccess: () => {
      toast.success('Booking extended successfully');
      setOpen(false);
      setDuration('');
      queryClient.invalidateQueries({ queryKey: ['userLocker'] });
    },
    onError: () => {
      toast.error('Failed to extend booking');
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-800">
          <Clock className="w-4 h-4 mr-2" />
          Extend Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a2332] border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#7cfc00]" />
            Extend Booking
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {locker.booking_end && (
            <div className="bg-[#0d1320] rounded-lg p-3 border border-gray-700">
              <p className="text-gray-400 text-xs">Current Expiry</p>
              <p className="text-white text-sm mt-1">
                {format(new Date(locker.booking_end), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          )}

          <div>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-[#0d1320] border-gray-700 text-white">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-gray-700">
                {durations.map((d) => (
                  <SelectItem key={d.value} value={d.value} className="text-white">
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {duration && locker.booking_end && (
            <div className="bg-[#7cfc00]/10 rounded-lg p-3 border border-[#7cfc00]/30">
              <p className="text-gray-400 text-xs">New Expiry</p>
              <p className="text-[#7cfc00] text-sm mt-1">
                {format(addHours(new Date(locker.booking_end), parseInt(duration)), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => extendBookingMutation.mutate()}
              disabled={!duration || extendBookingMutation.isPending}
              className="flex-1 bg-[#7cfc00] hover:bg-[#6be600] text-black"
            >
              {extendBookingMutation.isPending ? 'Extending...' : 'Extend'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}