import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  ShoppingCart, 
  Zap, 
  Shirt, 
  Truck, 
  Watch,
  Settings,
  CreditCard,
  Bot,
  Users,
  MessageSquare,
  LogOut
} from 'lucide-react';
import ActionCard from '../components/dashboard/ActionCard';
import SectionHeader from '../components/dashboard/SectionHeader';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const primaryActions = [
    { icon: ShoppingCart, title: 'Shop', subtitle: 'Browse supplements', page: 'Shop', iconBg: 'bg-green-500', badge: 'Hot', badgeColor: 'bg-green-500' },
    { icon: ShoppingCart, title: 'Cart', subtitle: 'Review your items', page: 'Cart', iconBg: 'bg-amber-500', badge: 'New', badgeColor: 'bg-amber-500' },
    { icon: Zap, title: 'Rush Mode', subtitle: 'Emergency delivery', page: 'RushMode', iconBg: 'bg-red-500', badge: 'Fast', badgeColor: 'bg-red-500' },
  ];

  const dailyOperations = [
    { icon: Shirt, title: 'Activewear', subtitle: 'Laundry service', page: 'Activewear', iconBg: 'bg-cyan-500' },
    { icon: Truck, title: 'Deliveries', subtitle: 'Track packages', page: 'Deliveries', iconBg: 'bg-orange-500' },
    { icon: Watch, title: 'Wearables', subtitle: 'Connect devices', page: 'Wearables', iconBg: 'bg-purple-500' },
  ];

  const accountManagement = [
    { icon: Settings, title: 'Profile', subtitle: 'Account settings', page: 'Profile', iconBg: 'bg-lime-500' },
    { icon: CreditCard, title: 'Subscription', subtitle: 'Manage plan', page: 'Subscription', iconBg: 'bg-indigo-500' },
  ];

  const helpCommunity = [
    { icon: Bot, title: 'VantaBot', subtitle: 'AI assistant', page: 'VantaBot', iconBg: 'bg-slate-600' },
    { icon: Users, title: 'Community', subtitle: 'Connect & share', page: 'Community', iconBg: 'bg-pink-500' },
    { icon: MessageSquare, title: 'Beta Feedback', subtitle: 'Help us improve', page: 'Feedback', iconBg: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1a2332] rounded-full flex items-center justify-center border border-gray-700">
            <span className="text-[#7cfc00] text-xl">👤</span>
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{user.full_name || 'User'}</h1>
            <p className="text-gray-400 text-sm">You're covered today</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="bg-transparent border-gray-700 hover:bg-gray-800"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="w-5 h-5 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Primary Actions */}
      <div>
        <SectionHeader title="Essentials" subtitle="Everything handled" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {primaryActions.map((action) => (
            <ActionCard key={action.title} {...action} />
          ))}
        </div>
      </div>

      {/* Daily Operations */}
      <div>
        <SectionHeader title="Operations" subtitle="Ready when you are" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dailyOperations.map((action) => (
            <ActionCard key={action.title} {...action} />
          ))}
        </div>
      </div>

      {/* Account & Management */}
      <div>
        <SectionHeader title="Your Account" subtitle="Preferences and settings" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accountManagement.map((action) => (
            <ActionCard key={action.title} {...action} />
          ))}
        </div>
      </div>

      {/* Help & Community */}
      <div>
        <SectionHeader title="Support" subtitle="We're here to help" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {helpCommunity.map((action) => (
            <ActionCard key={action.title} {...action} />
          ))}
        </div>
      </div>
    </div>
  );
}