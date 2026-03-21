import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Clock, Wrench, TrendingDown } from 'lucide-react';
import { useOptimisticUpdate } from '@/components/hooks/useOptimisticUpdate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MobileSelect from '@/components/mobile/MobileSelect';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function IssueManagement() {
  const queryClient = useQueryClient();

  const { data: issues = [] } = useQuery({
    queryKey: ['allIssues'],
    queryFn: () => base44.entities.LockerIssue.list('-created_date'),
  });

  const { isPending: isUpdatingIssue, execute: optimisticUpdateIssue } = useOptimisticUpdate(
    ['allIssues'],
    ({ issueId, status }) => base44.entities.LockerIssue.update(issueId, { status })
  );

  const handleIssueStatusChange = (issueId, status) => {
    const oldIssues = issues;
    const newIssues = issues.map(i => i.id === issueId ? { ...i, status } : i);
    optimisticUpdateIssue(oldIssues, newIssues, 'Issue updated');
  };

  // Legacy alias kept in case any other caller uses it
  const updateIssueMutation = { mutate: ({ issueId, status }) => handleIssueStatusChange(issueId, status) };

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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-border overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-2">Open Issues</p>
                  <p className="text-foreground text-3xl font-bold">{openIssues}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-yellow-500 to-orange-600"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-2">In Progress</p>
                  <p className="text-foreground text-3xl font-bold">{inProgressIssues}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Wrench className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-2">Resolved</p>
                  <p className="text-foreground text-3xl font-bold">{resolvedIssues}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Issues List */}
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="bg-gradient-to-r from-muted to-transparent border-b border-border">
          <CardTitle className="text-foreground">All Issues</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {issues.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-muted-foreground text-lg">No issues reported</p>
              <p className="text-muted-foreground text-sm mt-1">All systems are running smoothly</p>
            </div>
          ) : (
            <div className="space-y-4">
              {issues.map((issue, index) => {
                const StatusIcon = statusConfig[issue.status]?.icon || AlertTriangle;
                return (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gradient-to-r from-muted to-card rounded-xl p-5 border border-border hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                          issue.status === 'open' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                          issue.status === 'in_progress' ? 'bg-gradient-to-br from-yellow-500 to-orange-600' :
                          'bg-gradient-to-br from-green-500 to-emerald-600'
                        }`}>
                          <StatusIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge className={`${
                              issue.status === 'open' ? 'bg-red-100 text-red-800 border-red-200' :
                              issue.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              'bg-green-100 text-green-800 border-green-200'
                            } border px-3 py-1`}>
                              {statusConfig[issue.status]?.label}
                            </Badge>
                            <Badge className="bg-gray-100 text-gray-800 border-gray-200 border">
                              {issueTypeLabels[issue.issue_type]}
                            </Badge>
                            <Badge className={`border ${
                              issue.priority === 'high' ? 'bg-red-50 text-red-700 border-red-300' :
                              issue.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                              'bg-gray-100 text-gray-700 border-gray-300'
                            }`}>
                              {issue.priority} priority
                            </Badge>
                          </div>
                          <p className="text-foreground font-semibold mb-1">Locker: {issue.locker_id}</p>
                          <p className="text-muted-foreground text-sm mb-1">Reported by: {issue.user_email}</p>
                          {issue.description && (
                            <p className="text-foreground text-sm mt-2 bg-card p-3 rounded-lg border border-border">{issue.description}</p>
                          )}
                          <p className="text-muted-foreground text-xs mt-2">
                            {format(new Date(issue.created_date), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="w-44">
                        <MobileSelect
                          options={[
                            { value: 'open', label: 'Open' },
                            { value: 'in_progress', label: 'In Progress' },
                            { value: 'resolved', label: 'Resolved' }
                          ]}
                          value={issue.status}
                          onValueChange={(status) => handleIssueStatusChange(issue.id, status)}
                          placeholder="Update Status"
                          trigger={
                            <Select
                              value={issue.status}
                              onValueChange={(status) => handleIssueStatusChange(issue.id, status)}
                            >
                              <SelectTrigger className="border-border bg-card">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border">
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                              </SelectContent>
                            </Select>
                          }
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}