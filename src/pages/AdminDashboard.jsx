import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OverviewStats from '../components/admin/OverviewStats';
import UserManagement from '../components/admin/UserManagement';
import GymManagement from '../components/admin/GymManagement';
import IssueManagement from '../components/admin/IssueManagement';
import SubscriptionManagement from '../components/admin/SubscriptionManagement';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-500" />
            Admin Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Manage your VANTA application</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-[#1a2332] border border-gray-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#7cfc00] data-[state=active]:text-black">
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-[#7cfc00] data-[state=active]:text-black">
            Users
          </TabsTrigger>
          <TabsTrigger value="gyms" className="data-[state=active]:bg-[#7cfc00] data-[state=active]:text-black">
            Gyms & Lockers
          </TabsTrigger>
          <TabsTrigger value="issues" className="data-[state=active]:bg-[#7cfc00] data-[state=active]:text-black">
            Issues
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-[#7cfc00] data-[state=active]:text-black">
            Subscriptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewStats />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="gyms">
          <GymManagement />
        </TabsContent>

        <TabsContent value="issues">
          <IssueManagement />
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}