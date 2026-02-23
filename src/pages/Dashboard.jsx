import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PullToRefresh from '../components/mobile/PullToRefresh';
import { 
  ShoppingCart, 
  Zap, 
  Shirt, 
  Truck, 
  Watch,
  Settings,
  CreditCard,
  Package,
  ChevronRight,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SmartSuggestions from '../components/dashboard/SmartSuggestions';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Auth error:', e);
        setUser(null);
      }
    };
    loadUser();
  }, []);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-secondary)] text-sm">Loading your dashboard...</p>
      </div>
    );
  }

  // System components - integrated readiness layers
  const quickActions = [
    { icon: ShoppingCart, title: 'Shop', subtitle: 'Replenishment', page: 'Shop', color: 'from-green-500 to-emerald-600' },
    { icon: Zap, title: 'Rush', subtitle: 'Redundancy', page: 'RushMode', color: 'from-red-500 to-pink-600' },
    { icon: Shirt, title: 'Laundry', subtitle: 'Execution', page: 'LaundryOrder', color: 'from-cyan-500 to-blue-600' },
    { icon: Truck, title: 'Track', subtitle: 'Distribution', page: 'Deliveries', color: 'from-orange-500 to-amber-600' },
  ];

  // System controls - organized by function
  const services = {
    account: [
      { icon: Settings, title: 'Profile & Locker', subtitle: 'Distribution nodes', page: 'Profile' },
      { icon: CreditCard, title: 'Subscription', subtitle: 'System access', page: 'Subscription' },
      { icon: Package, title: 'Order History', subtitle: 'Execution log', page: 'OrderHistory' },
      { icon: Watch, title: 'Wearables', subtitle: 'Signal input', page: 'Wearables' },
    ],
    support: [
      { icon: Sparkles, title: 'RokiBot', subtitle: 'System intelligence', page: 'RokiBot' },
      { icon: MessageCircle, title: 'Support Chat', subtitle: 'Human backup', page: 'Support' },
    ],
  };

  const adminActions = user?.role === 'admin' ? [
    { icon: Settings, title: 'Admin Dashboard', page: 'AdminDashboard' },
  ] : [];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-primary)] to-teal-500 rounded-full flex items-center justify-center overflow-hidden">
              {user.profile_photo ? (
                <img src={user.profile_photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-black font-bold text-sm">
                  {user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-[var(--color-text-primary)] text-lg font-bold">
                {user.full_name?.split(' ')[0] || 'Hey'}
              </h1>
              <p className="text-[var(--color-text-secondary)] text-xs">Readiness Operating System</p>
            </div>
          </div>
        </div>

        {/* System Components */}
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={createPageUrl(action.page)}
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all select-none"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--color-text-primary)] text-sm font-bold truncate">
                    {action.title}
                  </p>
                  <p className="text-[var(--color-text-secondary)] text-xs truncate">
                    {action.subtitle}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Smart Suggestions */}
        <SmartSuggestions user={user} />

        {/* System Status */}
        <Card className="bg-gradient-to-br from-[var(--color-primary)]/10 to-emerald-500/10 border-[var(--color-primary)]/30">
          <CardContent className="p-4">
            <Link to={createPageUrl('Cart')} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--color-primary)]/20 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-[var(--color-text-primary)] font-semibold text-sm">Scheduled Supplies</p>
                  <p className="text-[var(--color-text-secondary)] text-xs">Ready for execution</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)]" />
            </Link>
          </CardContent>
        </Card>

        {/* Services Menu - Compact List */}
        <div className="space-y-4">
          {/* System Controls */}
          <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
            <CardContent className="p-4">
              <h3 className="text-[var(--color-text-primary)] font-semibold text-sm mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                System Controls
              </h3>
              <div className="space-y-1">
                {services.account.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.title}
                      to={createPageUrl(item.page)}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        <div>
                          <p className="text-[var(--color-text-primary)] text-sm font-medium">{item.title}</p>
                          <p className="text-[var(--color-text-muted)] text-xs">{item.subtitle}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Intelligence Layer */}
          <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
            <CardContent className="p-4">
              <h3 className="text-[var(--color-text-primary)] font-semibold text-sm mb-3 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Intelligence
              </h3>
              <div className="space-y-1">
                {services.support.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.title}
                      to={createPageUrl(item.page)}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        <div>
                          <p className="text-[var(--color-text-primary)] text-sm font-medium">{item.title}</p>
                          <p className="text-[var(--color-text-muted)] text-xs">{item.subtitle}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Admin Section - if admin */}
          {adminActions.length > 0 && (
            <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
              <CardContent className="p-4">
                {adminActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.title}
                      to={createPageUrl(item.page)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <Icon className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <p className="text-[var(--color-text-primary)] font-semibold text-sm">{item.title}</p>
                          <p className="text-[var(--color-text-secondary)] text-xs">Platform management</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)]" />
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}