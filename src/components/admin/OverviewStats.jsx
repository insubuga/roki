import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, DollarSign, CreditCard, TrendingUp, Lock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OverviewStats() {
  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['allPayments'],
    queryFn: () => base44.entities.Payment.list(),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['allSubscriptions'],
    queryFn: () => base44.entities.Subscription.list(),
  });

  const { data: lockers = [] } = useQuery({
    queryKey: ['allLockers'],
    queryFn: () => base44.entities.Locker.list(),
  });

  const { data: issues = [] } = useQuery({
    queryKey: ['allIssues'],
    queryFn: () => base44.entities.LockerIssue.list(),
  });

  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const monthlyRevenue = payments
    .filter(p => {
      const paymentDate = new Date(p.created_date);
      const now = new Date();
      return paymentDate.getMonth() === now.getMonth() && 
             paymentDate.getFullYear() === now.getFullYear() &&
             p.status === 'completed';
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const activeSubscriptions = subscriptions.filter(s => s.plan !== 'free').length;
  const claimedLockers = lockers.filter(l => l.status === 'claimed').length;
  const openIssues = issues.filter(i => i.status === 'open').length;

  const stats = [
    { 
      title: 'Total Users', 
      value: users.length, 
      icon: Users, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20'
    },
    { 
      title: 'Total Revenue', 
      value: `$${totalRevenue.toFixed(2)}`, 
      icon: DollarSign, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/20'
    },
    { 
      title: 'This Month', 
      value: `$${monthlyRevenue.toFixed(2)}`, 
      icon: TrendingUp, 
      color: 'text-[#7cfc00]',
      bgColor: 'bg-[#7cfc00]/20'
    },
    { 
      title: 'Active Subscriptions', 
      value: activeSubscriptions, 
      icon: CreditCard, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/20'
    },
    { 
      title: 'Claimed Lockers', 
      value: claimedLockers, 
      icon: Lock, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20'
    },
    { 
      title: 'Open Issues', 
      value: openIssues, 
      icon: AlertCircle, 
      color: 'text-red-500',
      bgColor: 'bg-red-500/20'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-[#1a2332] border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{stat.title}</p>
                    <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card className="bg-[#1a2332] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payments.slice(0, 10).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between bg-[#0d1320] rounded-lg p-3">
                <div>
                  <p className="text-white text-sm font-semibold">{payment.user_email}</p>
                  <p className="text-gray-400 text-xs">{payment.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#7cfc00] font-bold">${payment.amount.toFixed(2)}</p>
                  <p className="text-gray-400 text-xs capitalize">{payment.status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}