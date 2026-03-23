import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Shield, ArrowLeft, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OverviewStats from '../components/admin/OverviewStats';
import UserManagement from '../components/admin/UserManagement';
import GymManagement from '../components/admin/GymManagement';
import IssueManagement from '../components/admin/IssueManagement';
import SubscriptionManagement from '../components/admin/SubscriptionManagement';
import DriverManagement from '../components/admin/DriverManagement';
import AdminNotifications from '../components/admin/AdminNotifications';
import DriverApplicationReview from './DriverApplicationReview';
import ExpansionRequests from '../components/admin/ExpansionRequests';

function TabBadge({ count, color = 'bg-red-500' }) {
  if (!count) return null;
  return (
    <span className={`ml-1.5 inline-flex items-center justify-center text-[10px] font-bold text-white rounded-full px-1.5 py-0.5 min-w-[18px] ${color}`}>
      {count}
    </span>
  );
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        if (userData.role !== 'admin') {
          window.location.href = createPageUrl('Dashboard');
          return;
        }
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Live counts for tab badges
  const { data: pendingApps = [] } = useQuery({
    queryKey: ['pendingApps'],
    queryFn: () => base44.entities.DriverApplication.filter({ status: 'submitted' }),
    enabled: !!user,
  });
  const { data: openIssues = [] } = useQuery({
    queryKey: ['openIssuesBadge'],
    queryFn: () => base44.entities.LockerIssue.filter({ status: 'open' }),
    enabled: !!user,
  });
  const { data: adminNotifs = [] } = useQuery({
    queryKey: ['adminNotifsBadge', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email, read: false }),
    enabled: !!user?.email,
  });

  const unreadAlerts = adminNotifs.filter(n => n.type === 'system').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 -m-6 p-6">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shadow">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">Admin Dashboard</h1>
            <p className="text-gray-500 text-xs mt-0.5">Signed in as {user.full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadAlerts > 0 && (
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadAlerts}</span>
            </div>
          )}
          <div className="text-xs text-gray-400 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-5">
        <div className="overflow-x-auto">
          <TabsList className="bg-white border border-gray-200 shadow-sm p-1 w-max">
            <TabsTrigger value="overview" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-sm">
              Overview
              {unreadAlerts > 0 && <TabBadge count={unreadAlerts} />}
            </TabsTrigger>
            <TabsTrigger value="applications" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-sm">
              Applications
              <TabBadge count={pendingApps.length} />
            </TabsTrigger>
            <TabsTrigger value="drivers" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-sm">
              Drivers
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-sm">
              Users
            </TabsTrigger>
            <TabsTrigger value="gyms" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-sm">
              Gyms & Lockers
            </TabsTrigger>
            <TabsTrigger value="issues" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-sm">
              Issues
              <TabBadge count={openIssues.length} color="bg-orange-500" />
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-sm">
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="expansion" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-sm">
              Expansion
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="space-y-5">
            {unreadAlerts > 0 && <AdminNotifications user={user} />}
            <OverviewStats />
          </div>
        </TabsContent>
        <TabsContent value="applications"><DriverApplicationReview /></TabsContent>
        <TabsContent value="drivers"><DriverManagement /></TabsContent>
        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="gyms"><GymManagement /></TabsContent>
        <TabsContent value="issues"><IssueManagement /></TabsContent>
        <TabsContent value="subscriptions"><SubscriptionManagement /></TabsContent>
        <TabsContent value="expansion"><ExpansionRequests /></TabsContent>
      </Tabs>
    </div>
  );
}