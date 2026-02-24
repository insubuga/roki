import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, Settings, User, CreditCard, Calendar, MapPin, Bell, Shield, HelpCircle } from 'lucide-react';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { useQueryClient } from '@tanstack/react-query';

export default function Configuration() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const configSections = [
    {
      title: 'System',
      items: [
        { icon: User, title: 'Profile & Identity', subtitle: 'User credentials and settings', page: 'Profile' },
        { icon: MapPin, title: 'Node Assignment', subtitle: 'Locker location and access', page: 'Profile' },
        { icon: Calendar, title: 'Cycle Schedule', subtitle: 'Pickup and delivery windows', page: 'Schedule' },
      ]
    },
    {
      title: 'Access',
      items: [
        { icon: CreditCard, title: 'Subscription Plan', subtitle: 'Coverage tier and billing', page: 'Subscription' },
        { icon: Shield, title: 'Backup Coverage', subtitle: 'Emergency credits and SLA', page: 'Subscription' },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: Bell, title: 'Notifications', subtitle: 'Alert preferences', page: 'Profile' },
        { icon: HelpCircle, title: 'Help & Support', subtitle: 'Documentation and assistance', page: 'Support' },
      ]
    }
  ];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-foreground text-xl font-bold font-mono">CONFIGURATION</h1>
          <p className="text-muted-foreground text-xs font-mono">System settings and preferences</p>
        </div>

        {/* Account Summary */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center overflow-hidden">
                {user.profile_photo ? (
                  <img src={user.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold">
                    {user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </span>
                )}
              </div>
              <div>
                <p className="text-foreground font-mono font-bold">{user.full_name}</p>
                <p className="text-muted-foreground font-mono text-xs">{user.email}</p>
                <p className="text-muted-foreground font-mono text-xs mt-1">
                  {user.role === 'admin' ? 'SYSTEM ADMIN' : 'ACTIVE MEMBER'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Sections */}
        {configSections.map((section, idx) => (
          <Card key={idx} className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="text-foreground font-mono font-semibold text-sm uppercase mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.title}
                      to={createPageUrl(item.page)}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-foreground text-sm font-medium font-mono">{item.title}</p>
                          <p className="text-muted-foreground text-xs font-mono">{item.subtitle}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Danger Zone */}
        <Card className="bg-card border-red-600/30">
          <CardContent className="p-4">
            <h3 className="text-red-600 font-mono font-semibold text-sm uppercase mb-3">
              Danger Zone
            </h3>
            <Link
              to={createPageUrl('Profile')}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-red-600/10 transition-colors"
            >
              <div>
                <p className="text-foreground text-sm font-medium font-mono">Delete Account</p>
                <p className="text-muted-foreground text-xs font-mono">Permanently remove all data</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </PullToRefresh>
  );
}