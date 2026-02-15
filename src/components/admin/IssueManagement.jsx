import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function IssueManagement() {
  const queryClient = useQueryClient();

  const { data: issues = [] } = useQuery({
    queryKey: ['allIssues'],
    queryFn: () => base44.entities.LockerIssue.list('-created_date'),
  });

  const updateIssueMutation = useMutation({
    mutationFn: ({ issueId, status }) => base44.entities.LockerIssue.update(issueId, { status }),
    onSuccess: () => {
      toast.success('Issue updated');
      queryClient.invalidateQueries({ queryKey: ['allIssues'] });
    },
  });

  const statusConfig = {
    open: { icon: AlertTriangle, color: 'bg-red-500/20 text-red-500', label: 'Open' },
    in_progress: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-500', label: 'In Progress' },
    resolved: { icon: CheckCircle, color: 'bg-green-500/20 text-green-500', label: 'Resolved' },
  };

  const issueTypeLabels = {
    broken_lock: 'Broken Lock',
    damaged: 'Damaged',
    dirty: 'Dirty',
    needs_cleaning: 'Needs Cleaning',
    stuck_door: 'Stuck Door',
    other: 'Other',
  };

  const openIssues = issues.filter(i => i.status === 'open').length;
  const inProgressIssues = issues.filter(i => i.status === 'in_progress').length;
  const resolvedIssues = issues.filter(i => i.status === 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Open Issues</p>
                <p className="text-white text-2xl font-bold mt-1">{openIssues}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">In Progress</p>
                <p className="text-white text-2xl font-bold mt-1">{inProgressIssues}</p>
              </div>
              <Wrench className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Resolved</p>
                <p className="text-white text-2xl font-bold mt-1">{resolvedIssues}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues List */}
      <Card className="bg-[#1a2332] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">All Issues</CardTitle>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No issues reported</p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => {
                const StatusIcon = statusConfig[issue.status]?.icon || AlertTriangle;
                return (
                  <div key={issue.id} className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${statusConfig[issue.status]?.color} rounded-lg flex items-center justify-center`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={statusConfig[issue.status]?.color}>
                              {statusConfig[issue.status]?.label}
                            </Badge>
                            <Badge variant="outline" className="text-gray-400">
                              {issueTypeLabels[issue.issue_type]}
                            </Badge>
                            <Badge variant="outline" className={`
                              ${issue.priority === 'high' ? 'text-red-500 border-red-500' :
                                issue.priority === 'medium' ? 'text-yellow-500 border-yellow-500' :
                                'text-gray-500 border-gray-500'}
                            `}>
                              {issue.priority} priority
                            </Badge>
                          </div>
                          <p className="text-white text-sm font-semibold">Locker ID: {issue.locker_id}</p>
                          <p className="text-gray-400 text-xs">Reported by: {issue.user_email}</p>
                          {issue.description && (
                            <p className="text-gray-300 text-sm mt-2">{issue.description}</p>
                          )}
                          <p className="text-gray-500 text-xs mt-2">
                            {format(new Date(issue.created_date), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="w-40">
                        <Select
                          value={issue.status}
                          onValueChange={(status) => updateIssueMutation.mutate({ issueId: issue.id, status })}
                        >
                          <SelectTrigger className="bg-[#1a2332] border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a2332] border-gray-700">
                            <SelectItem value="open" className="text-white">Open</SelectItem>
                            <SelectItem value="in_progress" className="text-white">In Progress</SelectItem>
                            <SelectItem value="resolved" className="text-white">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}