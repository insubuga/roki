import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Lock, CreditCard, Calendar, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

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
      <Card className="bg-white border-gray-200 shadow-lg">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search users by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 border-gray-300 focus:border-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="bg-white border-gray-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b border-gray-200">
          <CardTitle className="text-gray-900">All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {filteredUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedUser(user)}
                className="flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-semibold">{user.full_name || 'No Name'}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
                      <Mail className="w-3.5 h-3.5" />
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`${
                    user.role === 'admin' ? 'bg-red-100 text-red-800 border-red-200' : 
                    user.role === 'driver' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                    'bg-blue-100 text-blue-800 border-blue-200'
                  } border px-3 py-1`}>
                    {user.role}
                  </Badge>
                  <p className="text-gray-500 text-xs">
                    {format(new Date(user.created_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="bg-white border-gray-200 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                User Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Basic Info */}
              <Card className="border-gray-200 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <CardContent className="p-4">
                  <h3 className="text-gray-900 font-semibold mb-3">Account Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Name:</span>
                      <span className="text-gray-900 font-medium">{selectedUser.full_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Email:</span>
                      <span className="text-gray-900 font-medium">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Role:</span>
                      <Badge className={`${
                        selectedUser.role === 'admin' ? 'bg-red-100 text-red-800 border-red-200' : 
                        selectedUser.role === 'driver' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                        'bg-blue-100 text-blue-800 border-blue-200'
                      } border`}>
                        {selectedUser.role}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Joined:</span>
                      <span className="text-gray-900 font-medium">{format(new Date(selectedUser.created_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Locker Status */}
              <Card className="border-gray-200 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
                <CardContent className="p-4">
                  <h3 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-600" />
                    Locker Status
                  </h3>
                  {userLocker ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Locker Number:</span>
                        <span className="text-green-700 font-bold text-lg">#{userLocker.locker_number}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Status:</span>
                        <Badge className="bg-green-100 text-green-800 border-green-200 border capitalize">{userLocker.status}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Lock Status:</span>
                        <span className="text-gray-900 font-medium">{userLocker.is_locked ? 'Locked 🔒' : 'Unlocked 🔓'}</span>
                      </div>
                      {userLocker.booking_end && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Expires:</span>
                          <span className="text-gray-900 font-medium">{format(new Date(userLocker.booking_end), 'MMM d, h:mm a')}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No active locker</p>
                  )}
                </CardContent>
              </Card>

              {/* Subscription */}
              <Card className="border-gray-200 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
                <CardContent className="p-4">
                  <h3 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    Subscription
                  </h3>
                  {userSubscription ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Plan:</span>
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 border capitalize">{userSubscription.plan}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Monthly Price:</span>
                        <span className="text-gray-900 font-medium">${userSubscription.monthly_price?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No active subscription</p>
                  )}
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card className="border-gray-200 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-600"></div>
                <CardContent className="p-4">
                  <h3 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Payment History
                  </h3>
                  {userPayments.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {userPayments.map((payment) => (
                        <div key={payment.id} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                          <span className="text-gray-600">{format(new Date(payment.created_date), 'MMM d, yyyy')}</span>
                          <span className="text-green-700 font-semibold">${payment.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No payment history</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}