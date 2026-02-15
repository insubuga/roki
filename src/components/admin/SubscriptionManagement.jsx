import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, TrendingUp, Users, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function SubscriptionManagement() {
  const [editingPlan, setEditingPlan] = useState(null);
  const queryClient = useQueryClient();

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['allSubscriptions'],
    queryFn: () => base44.entities.Subscription.list(),
  });

  const planStats = subscriptions.reduce((acc, sub) => {
    acc[sub.plan] = (acc[sub.plan] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.monthly_price || 0), 0);

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ subId, data }) => base44.entities.Subscription.update(subId, data),
    onSuccess: () => {
      toast.success('Subscription updated');
      queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] });
      setEditingPlan(null);
    },
  });

  const planColors = {
    free: 'bg-gray-500/20 text-gray-500',
    basic: 'bg-blue-500/20 text-blue-500',
    pro: 'bg-purple-500/20 text-purple-500',
    elite: 'bg-[#7cfc00]/20 text-[#7cfc00]',
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Subscribers</p>
                <p className="text-white text-2xl font-bold mt-1">{subscriptions.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Monthly Revenue</p>
                <p className="text-white text-2xl font-bold mt-1">${totalRevenue.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Paid Plans</p>
                <p className="text-white text-2xl font-bold mt-1">
                  {subscriptions.filter(s => s.plan !== 'free').length}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card className="bg-[#1a2332] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {['free', 'basic', 'pro', 'elite'].map((plan) => (
              <div key={plan} className={`${planColors[plan]} rounded-lg p-4 border border-current`}>
                <p className="text-xs uppercase font-semibold">{plan}</p>
                <p className="text-3xl font-bold mt-2">{planStats[plan] || 0}</p>
                <p className="text-xs mt-1">subscribers</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Subscriptions */}
      <Card className="bg-[#1a2332] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                <div>
                  <p className="text-white font-semibold">{sub.user_email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={planColors[sub.plan]}>
                      {sub.plan}
                    </Badge>
                    <span className="text-gray-400 text-sm">${sub.monthly_price?.toFixed(2) || '0.00'}/mo</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Laundry: {sub.laundry_credits_used || 0}/{sub.laundry_credits || 0}</span>
                    <span>Rush: {sub.rush_deliveries_used || 0}/{sub.rush_deliveries_included || 0}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingPlan(sub)}
                  className="border-gray-700 text-white hover:bg-gray-800"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingPlan && (
        <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
          <DialogContent className="bg-[#1a2332] border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Edit Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-gray-400">User Email</Label>
                <Input
                  value={editingPlan.user_email}
                  disabled
                  className="bg-[#0d1320] border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-400">Plan</Label>
                <Input
                  value={editingPlan.plan}
                  onChange={(e) => setEditingPlan({ ...editingPlan, plan: e.target.value })}
                  className="bg-[#0d1320] border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-400">Monthly Price</Label>
                <Input
                  type="number"
                  value={editingPlan.monthly_price || 0}
                  onChange={(e) => setEditingPlan({ ...editingPlan, monthly_price: parseFloat(e.target.value) })}
                  className="bg-[#0d1320] border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-400">Laundry Credits</Label>
                <Input
                  type="number"
                  value={editingPlan.laundry_credits || 0}
                  onChange={(e) => setEditingPlan({ ...editingPlan, laundry_credits: parseInt(e.target.value) })}
                  className="bg-[#0d1320] border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-400">Rush Deliveries Included</Label>
                <Input
                  type="number"
                  value={editingPlan.rush_deliveries_included || 0}
                  onChange={(e) => setEditingPlan({ ...editingPlan, rush_deliveries_included: parseInt(e.target.value) })}
                  className="bg-[#0d1320] border-gray-700 text-white mt-1"
                />
              </div>
              <Button
                onClick={() => updateSubscriptionMutation.mutate({ subId: editingPlan.id, data: editingPlan })}
                className="w-full bg-[#7cfc00] text-black hover:bg-[#6be600]"
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}