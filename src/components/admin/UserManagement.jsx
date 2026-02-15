import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Lock, CreditCard, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const { data: userLocker } = useQuery({
    queryKey: ['userLocker', selectedUser?.email],
    queryFn: async () => {
      const lockers = await base44.entities.Locker.filter({ user_email: selectedUser?.email });
      return lockers[0];
    },
    enabled: !!selectedUser?.email,
  });

  const { data: userPayments = [] } = useQuery({
    queryKey: ['userPayments', selectedUser?.email],
    queryFn: () => base44.entities.Payment.filter({ user_email: selectedUser?.email }, '-created_date'),
    enabled: !!selectedUser?.email,
  });

  const { data: userSubscription } = useQuery({
    queryKey: ['userSubscription', selectedUser?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_email: selectedUser?.email });
      return subs[0];
    },
    enabled: !!selectedUser?.email,
  });

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="bg-[#1a2332] border-gray-800">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search users by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0d1320] border-gray-700 text-white pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="bg-[#1a2332] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="flex items-center justify-between bg-[#0d1320] rounded-lg p-4 hover:bg-[#1a2332] cursor-pointer transition-colors border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#7cfc00]/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-[#7cfc00]" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{user.full_name || 'No Name'}</p>
                    <p className="text-gray-400 text-sm">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={user.role === 'admin' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}>
                    {user.role}
                  </Badge>
                  <p className="text-gray-500 text-xs">
                    {format(new Date(user.created_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#7cfc00]" />
                User Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Basic Info */}
              <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-3">Account Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white">{selectedUser.full_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Role:</span>
                    <Badge className={selectedUser.role === 'admin' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}>
                      {selectedUser.role}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Joined:</span>
                    <span className="text-white">{format(new Date(selectedUser.created_date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>

              {/* Locker Status */}
              <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Locker Status
                </h3>
                {userLocker ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Locker Number:</span>
                      <span className="text-[#7cfc00] font-bold">#{userLocker.locker_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <Badge className="bg-green-500/20 text-green-500">{userLocker.status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Lock Status:</span>
                      <span className="text-white">{userLocker.is_locked ? 'Locked' : 'Unlocked'}</span>
                    </div>
                    {userLocker.booking_end && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Expires:</span>
                        <span className="text-white">{format(new Date(userLocker.booking_end), 'MMM d, h:mm a')}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No active locker</p>
                )}
              </div>

              {/* Subscription */}
              <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Subscription
                </h3>
                {userSubscription ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Plan:</span>
                      <Badge className="bg-purple-500/20 text-purple-500 capitalize">{userSubscription.plan}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Monthly Price:</span>
                      <span className="text-white">${userSubscription.monthly_price?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No active subscription</p>
                )}
              </div>

              {/* Payment History */}
              <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Payment History
                </h3>
                {userPayments.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {userPayments.map((payment) => (
                      <div key={payment.id} className="flex justify-between text-sm">
                        <span className="text-gray-400">{format(new Date(payment.created_date), 'MMM d, yyyy')}</span>
                        <span className="text-[#7cfc00] font-semibold">${payment.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No payment history</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}