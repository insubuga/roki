import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock } from 'lucide-react';

const DAY_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
];

const WINDOW_OPTIONS = [
  { value: 'early_morning', label: '5–8 AM' },
  { value: 'morning', label: '8–11 AM' },
  { value: 'midday', label: '11 AM–2 PM' },
  { value: 'afternoon', label: '2–5 PM' },
  { value: 'evening', label: '4–8 PM' },
  { value: 'night', label: '7–10 PM' },
];

const WINDOW_HOURS = {
  early_morning: { label: '5–8 AM', start: 5, end: 8 },
  morning: { label: '8–11 AM', start: 8, end: 11 },
  midday: { label: '11 AM–2 PM', start: 11, end: 14 },
  afternoon: { label: '2–5 PM', start: 14, end: 17 },
  evening: { label: '4–8 PM', start: 16, end: 20 },
  night: { label: '7–10 PM', start: 19, end: 22 },
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function RescheduleForecastDialog({ open, onClose, onConfirm, isPending, currentForecast }) {
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedWindow, setSelectedWindow] = useState('');

  const handleConfirm = () => {
    if (!selectedDay || !selectedWindow) return;

    const now = new Date();
    const targetDay = parseInt(selectedDay);
    const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
    const newDate = new Date(now);
    newDate.setDate(now.getDate() + daysUntil);

    const window = WINDOW_HOURS[selectedWindow];
    newDate.setHours(window.start, 0, 0, 0);
    const endDate = new Date(newDate);
    endDate.setHours(window.end, 0, 0, 0);

    const dayName = DAY_NAMES[newDate.getDay()];

    onConfirm({
      predicted_date: newDate.toISOString().split('T')[0],
      predicted_drop_window: `${dayName} ${window.label}`,
      predicted_drop_window_start: newDate.toISOString(),
      predicted_drop_window_end: endDate.toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground font-mono text-sm uppercase flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            Reschedule Cycle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground font-mono text-xs uppercase tracking-wider">Preferred Day</Label>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="bg-muted border-border text-foreground font-mono text-sm focus:ring-purple-500">
                <SelectValue placeholder="Select a day" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {DAY_OPTIONS.map(d => (
                  <SelectItem key={d.value} value={d.value} className="text-foreground font-mono">{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground font-mono text-xs uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" /> Time Window
            </Label>
            <Select value={selectedWindow} onValueChange={setSelectedWindow}>
              <SelectTrigger className="bg-muted border-border text-foreground font-mono text-sm focus:ring-purple-500">
                <SelectValue placeholder="Select a window" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {WINDOW_OPTIONS.map(w => (
                  <SelectItem key={w.value} value={w.value} className="text-foreground font-mono">{w.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-border font-mono text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs"
            onClick={handleConfirm}
            disabled={!selectedDay || !selectedWindow || isPending}
          >
            {isPending ? 'Saving...' : 'Confirm Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}