import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, DollarSign, CreditCard, TrendingUp, Lock, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

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
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-500',
      trend: '+12%',
      trendUp: true
    },
    { 
      title: 'Total Revenue', 
      value: `$${totalRevenue.toFixed(2)}`, 
      icon: DollarSign, 
      gradient: 'from-emerald-500 to-green-600',
      iconBg: 'bg-emerald-500',
      trend: '+18%',
      trendUp: true
    },
    { 
      title: 'This Month', 
      value: `$${monthlyRevenue.toFixed(2)}`, 
      icon: TrendingUp, 
      gradient: 'from-green-500 to-teal-600',
      iconBg: 'bg-green-500',
      trend: '+24%',
      trendUp: true
    },
    { 
      title: 'Active Subscriptions', 
      value: activeSubscriptions, 
      icon: CreditCard, 
      gradient: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-500',
      trend: '+8%',
      trendUp: true
    },
    { 
      title: 'Claimed Lockers', 
      value: claimedLockers, 
      icon: Lock, 
      gradient: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-500',
      trend: '+5%',
      trendUp: true
    },
    { 
      title: 'Open Issues', 
      value: openIssues, 
      icon: AlertCircle, 
      gradient: 'from-red-500 to-red-600',
      iconBg: 'bg-red-500',
      trend: '-3%',
      trendUp: false
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trendUp ? ArrowUpRight : ArrowDownRight;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 group">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
                <CardContent className="pt-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-gray-600 text-sm font-medium mb-2">{stat.title}</p>
                      <p className="text-gray-900 text-3xl font-bold">{stat.value}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendIcon className={`w-4 h-4 ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`} />
                        <span className={`text-sm font-semibold ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                          {stat.trend}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">vs last month</span>
                      </div>
                    </div>
                    <div className={`w-16 h-16 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full bg-gradient-to-r ${stat.gradient}`}
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      transition={{ delay: index * 0.1 + 0.3, duration: 0.8 }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card className="bg-white border border-gray-200 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 text-xl font-bold">Recent Payments</CardTitle>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Live</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {payments.slice(0, 10).map((payment, index) => (
              <motion.div 
                key={payment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-green-50 hover:to-transparent transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-900 text-sm font-semibold group-hover:text-green-700 transition-colors">{payment.user_email}</p>
                    <p className="text-gray-500 text-xs">{payment.description || 'Payment'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-700 font-bold text-lg">${payment.amount.toFixed(2)}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <div className={`w-2 h-2 rounded-full ${
                      payment.status === 'completed' ? 'bg-green-500' : 
                      payment.status === 'pending' ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`}></div>
                    <p className="text-gray-500 text-xs capitalize">{payment.status}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {payments.length === 0 && (
            <div className="py-16 text-center">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No payments yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}