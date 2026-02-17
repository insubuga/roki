import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { CreditCard, ArrowLeft, Download, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function PaymentHistory() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', user?.email],
    queryFn: async () => {
      const data = await base44.entities.Payment.filter({ user_email: user?.email }, '-created_date');
      return data || [];
    },
    enabled: !!user?.email,
  });

  const statusConfig = {
    completed: { icon: CheckCircle, color: 'bg-green-500/20 text-green-500 border-green-500/30', label: 'Completed' },
    pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', label: 'Pending' },
    failed: { icon: XCircle, color: 'bg-red-500/20 text-red-500 border-red-500/30', label: 'Failed' },
    refunded: { icon: RefreshCw, color: 'bg-blue-500/20 text-blue-500 border-blue-500/30', label: 'Refunded' },
  };

  const typeLabels = {
    locker_rental: 'Locker Rental',
    subscription: 'Subscription',
    service: 'Service',
    extension: 'Extension',
  };

  const totalSpent = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-[#7cfc00]" />
              Payment History
            </h1>
            <p className="text-gray-400 mt-1">View all your transactions</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Spent</p>
                <p className="text-white text-2xl font-bold mt-1">${totalSpent.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-[#7cfc00]/20 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-[#7cfc00]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Transactions</p>
                <p className="text-white text-2xl font-bold mt-1">{payments.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">This Month</p>
                <p className="text-white text-2xl font-bold mt-1">
                  ${payments
                    .filter(p => {
                      const paymentDate = new Date(p.created_date);
                      const now = new Date();
                      return paymentDate.getMonth() === now.getMonth() && 
                             paymentDate.getFullYear() === now.getFullYear() &&
                             p.status === 'completed';
                    })
                    .reduce((sum, p) => sum + p.amount, 0)
                    .toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Download className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="bg-[#1a2332] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => {
                const StatusIcon = statusConfig[payment.status]?.icon || Clock;
                return (
                  <div
                    key={payment.id}
                    className="bg-[#0d1320] rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${statusConfig[payment.status]?.color} border`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[payment.status]?.label}
                          </Badge>
                          <Badge variant="outline" className="text-gray-400">
                            {typeLabels[payment.payment_type]}
                          </Badge>
                        </div>
                        <p className="text-white font-semibold">{payment.description}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {format(new Date(payment.created_date), 'MMM d, yyyy h:mm a')}
                        </p>
                        {payment.stripe_payment_id && (
                          <p className="text-gray-500 text-xs mt-1 font-mono">
                            ID: {payment.stripe_payment_id}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-xl">${payment.amount.toFixed(2)}</p>
                        <p className="text-gray-400 text-xs mt-1">{payment.currency.toUpperCase()}</p>
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