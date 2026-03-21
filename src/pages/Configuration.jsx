import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight, Settings, User, CreditCard, Calendar, MapPin,
  Bell, Shield, HelpCircle, ArrowLeft, Trash2, AlertTriangle, LogOut
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import DeleteAccountSheet from '@/components/mobile/DeleteAccountSheet';
import PullToRefresh from '@/components/mobile/PullToRefresh';

export default function Configuration() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const handleRefresh = async () => { await queryClient.invalidateQueries(); };

  // Account deletion handled by DeleteAccountSheet component

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" aria-label="Loading configuration">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
      </div>
    );
  }

  const configSections = [
    {
      title: 'System',
      items: [
        { icon: User, title: 'Profile & Identity', subtitle: 'User credentials and settings', path: '/Profile' },
        { icon: MapPin, title: 'Node Assignment', subtitle: 'Locker location and access', path: '/Profile' },
        { icon: Calendar, title: 'Cycle Schedule', subtitle: 'Pickup and delivery windows', path: '/Schedule' },
      ]
    },
    {
      title: 'Access',
      items: [
        { icon: CreditCard, title: 'Subscription Plan', subtitle: 'Coverage tier and billing', path: '/Subscription' },
        { icon: Shield, title: 'Backup Coverage', subtitle: 'Emergency credits and SLA', path: '/Subscription' },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: Bell, title: 'Notifications', subtitle: 'Alert preferences', path: '/Notifications' },
        { icon: HelpCircle, title: 'Help & Support', subtitle: 'Documentation and assistance', path: '/Support' },
      ]
    }
  ];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6 max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/Dashboard" aria-label="Back to Dashboard">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px]" aria-label="Go back">
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Button>
          </Link>
          <div>
            <h1 className="text-foreground text-xl font-bold font-mono">CONFIGURATION</h1>
            <p className="text-muted-foreground text-xs font-mono">System settings and preferences</p>
          </div>
        </div>

        {/* User card */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" aria-hidden="true">
                {user.profile_photo
                  ? <img src={user.profile_photo} alt={`${user.full_name} profile photo`} className="w-full h-full object-cover" />
                  : <span className="text-white font-bold">{user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-mono font-bold truncate">{user.full_name}</p>
                <p className="text-muted-foreground font-mono text-xs truncate">{user.email}</p>
                <Badge className="mt-1 bg-green-600/10 text-green-600 border-green-600/30 font-mono text-[10px]">
                  {user.role === 'admin' ? 'SYSTEM ADMIN' : 'ACTIVE MEMBER'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Config sections */}
        {configSections.map((section, idx) => (
          <Card key={idx} className="bg-card border-border">
            <CardContent className="p-4">
              <h2 className="text-foreground font-mono font-semibold text-sm uppercase mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" aria-hidden="true" />
                {section.title}
              </h2>
              <nav aria-label={`${section.title} settings`}>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.title}
                        to={item.path}
                        aria-label={`${item.title}: ${item.subtitle}`}
                        className="flex items-center justify-between p-3 min-h-[44px] rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                          <div>
                            <p className="text-foreground text-sm font-medium font-mono">{item.title}</p>
                            <p className="text-muted-foreground text-xs font-mono">{item.subtitle}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </CardContent>
          </Card>
        ))}

        {/* Account actions */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-1">
            <h2 className="text-foreground font-mono font-semibold text-sm uppercase mb-3 flex items-center gap-2">
              <User className="w-4 h-4" aria-hidden="true" />
              Account
            </h2>
            <button
              onClick={() => base44.auth.logout()}
              aria-label="Sign out of your account"
              className="w-full flex items-center justify-between p-3 min-h-[44px] rounded-lg hover:bg-muted transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-foreground text-sm font-medium font-mono">Sign Out</p>
                  <p className="text-muted-foreground text-xs font-mono">End current session</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </CardContent>
        </Card>

        {/* Danger Zone — full deletion flow here */}
        <Card className="bg-card border-red-600/30">
          <CardContent className="p-4">
            <h2 className="text-red-600 font-mono font-semibold text-sm uppercase mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              Danger Zone
            </h2>

            <AlertDialog onOpenChange={(open) => { if (!open) setDeleteConfirmText(''); }}>
              <AlertDialogTrigger asChild>
                <button
                  aria-label="Permanently delete your account and all data"
                  className="w-full flex items-center justify-between p-3 min-h-[44px] rounded-lg hover:bg-red-600/10 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-4 h-4 text-red-500" aria-hidden="true" />
                    <div>
                      <p className="text-foreground text-sm font-medium font-mono">Delete Account</p>
                      <p className="text-muted-foreground text-xs font-mono">Permanently remove all data</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </AlertDialogTrigger>

              <AlertDialogContent className="bg-card border-border mx-4">
                <AlertDialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-red-950/30 border border-red-700 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <AlertDialogTitle className="text-foreground font-mono">Delete Account</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription className="text-muted-foreground font-mono text-sm">
                    This is permanent and cannot be undone. All data including profile, lockers, cycles, subscription and history will be erased immediately.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="px-1 pb-2 space-y-2">
                  <p className="text-muted-foreground font-mono text-xs uppercase tracking-wide">
                    Type <span className="text-red-500 font-bold">DELETE</span> to confirm
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    aria-label="Type DELETE to confirm account deletion"
                    className="bg-muted border-border text-foreground font-mono text-sm min-h-[44px]"
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel
                    className="bg-muted text-foreground border-border font-mono min-h-[44px]"
                    aria-label="Cancel account deletion"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 text-white font-mono min-h-[44px]"
                    aria-label="Confirm permanent account deletion"
                    onClick={() => deleteAccountMutation.mutate()}
                    disabled={deleteAccountMutation.isPending || deleteConfirmText !== 'DELETE'}
                  >
                    {deleteAccountMutation.isPending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Deleting...</>
                      : 'Delete Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

      </div>
    </PullToRefresh>
  );
}