import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Sparkles, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ReportIssueDialog({ locker, user }) {
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const issueTypes = [
    { value: 'broken_lock', label: 'Broken Lock', icon: Wrench },
    { value: 'damaged', label: 'Physical Damage', icon: AlertTriangle },
    { value: 'dirty', label: 'Needs Cleaning', icon: Sparkles },
    { value: 'needs_cleaning', label: 'Deep Clean Request', icon: Sparkles },
    { value: 'stuck_door', label: 'Stuck Door', icon: Wrench },
    { value: 'other', label: 'Other Issue', icon: AlertTriangle },
  ];

  const reportIssueMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.LockerIssue.create({
        locker_id: locker.id,
        user_email: user.email,
        issue_type: issueType,
        description,
        status: 'open',
        priority: issueType === 'broken_lock' ? 'high' : 'medium'
      });
    },
    onSuccess: () => {
      toast.success('Issue reported successfully');
      setOpen(false);
      setIssueType('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['lockerIssues'] });
    },
    onError: () => {
      toast.error('Failed to report issue');
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-800">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a2332] border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Report Locker Issue
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-gray-400">Issue Type</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger className="bg-[#0d1320] border-gray-700 text-white mt-1">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-gray-700">
                {issueTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value} className="text-white">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-400">Description (Optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional details..."
              className="bg-[#0d1320] border-gray-700 text-white mt-1 h-24"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => reportIssueMutation.mutate()}
              disabled={!issueType || reportIssueMutation.isPending}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              {reportIssueMutation.isPending ? 'Reporting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}