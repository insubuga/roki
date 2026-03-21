import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, TrendingUp, Users, Edit, DollarSign } from 'lucide-react';
import { useOptimisticUpdate } from '@/components/hooks/useOptimisticUpdate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-gray-200 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-2">Total Subscribers</p>
                  <p className="text-gray-900 text-3xl font-bold">{subscriptions.length}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-gray-200 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-2">Monthly Revenue</p>
                  <p className="text-gray-900 text-3xl font-bold">${totalRevenue.toFixed(2)}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-gray-200 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-2">Paid Plans</p>
                  <p className="text-gray-900 text-3xl font-bold">
                    {subscriptions.filter(s => s.plan !== 'free').length}
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <CreditCard className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Plan Distribution */}
      <Card className="bg-white border-gray-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent border-b border-gray-200">
          <CardTitle className="text-gray-900">Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { plan: 'free', gradient: 'from-gray-400 to-gray-500', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
              { plan: 'basic', gradient: 'from-blue-500 to-blue-600', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
              { plan: 'pro', gradient: 'from-purple-500 to-purple-600', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
              { plan: 'elite', gradient: 'from-green-500 to-emerald-600', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' }
            ].map((item, index) => (
              <motion.div
                key={item.plan}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`${item.bg} ${item.border} rounded-2xl p-6 border-2 text-center relative overflow-hidden group hover:shadow-lg transition-all`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
                <p className={`text-xs uppercase font-bold ${item.color} mb-3 tracking-wide`}>{item.plan}</p>
                <p className={`text-5xl font-bold ${item.color} mb-2`}>{planStats[item.plan] || 0}</p>
                <p className="text-xs text-gray-600 font-medium">subscribers</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Subscriptions */}
      <Card className="bg-white border-gray-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-transparent border-b border-gray-200">
          <CardTitle className="text-gray-900">All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {subscriptions.map((sub, index) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent transition-all group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-semibold">{sub.user_email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`border px-3 py-1 capitalize ${
                        sub.plan === 'free' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                        sub.plan === 'basic' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        sub.plan === 'pro' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                        'bg-green-100 text-green-800 border-green-200'
                      }`}>
                        {sub.plan}
                      </Badge>
                      <span className="text-gray-600 text-sm font-medium">${sub.monthly_price?.toFixed(2) || '0.00'}/mo</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                      <span className="bg-blue-50 px-2 py-1 rounded">Laundry: {sub.laundry_credits_used || 0}/{sub.laundry_credits || 0}</span>
                      <span className="bg-orange-50 px-2 py-1 rounded">Rush: {sub.rush_deliveries_used || 0}/{sub.rush_deliveries_included || 0}</span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingPlan(sub)}
                  className="border-gray-300 hover:bg-purple-50 hover:border-purple-300"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingPlan && (
        <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Edit Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-gray-700 font-medium">User Email</Label>
                <Input
                  value={editingPlan.user_email}
                  disabled
                  className="border-gray-300 mt-1 bg-gray-50"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-medium">Plan</Label>
                <Input
                  value={editingPlan.plan}
                  onChange={(e) => setEditingPlan({ ...editingPlan, plan: e.target.value })}
                  className="border-gray-300 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-medium">Monthly Price</Label>
                <Input
                  type="number"
                  value={editingPlan.monthly_price || 0}
                  onChange={(e) => setEditingPlan({ ...editingPlan, monthly_price: parseFloat(e.target.value) })}
                  className="border-gray-300 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-medium">Laundry Credits</Label>
                <Input
                  type="number"
                  value={editingPlan.laundry_credits || 0}
                  onChange={(e) => setEditingPlan({ ...editingPlan, laundry_credits: parseInt(e.target.value) })}
                  className="border-gray-300 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-medium">Rush Deliveries Included</Label>
                <Input
                  type="number"
                  value={editingPlan.rush_deliveries_included || 0}
                  onChange={(e) => setEditingPlan({ ...editingPlan, rush_deliveries_included: parseInt(e.target.value) })}
                  className="border-gray-300 mt-1"
                />
              </div>
              <Button
                onClick={() => updateSubscriptionMutation.mutate({ subId: editingPlan.id, data: editingPlan })}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800"
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