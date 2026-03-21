import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Lock, CreditCard, Calendar, Mail, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const roleBadge = (role) => {
  if (role === 'admin') return 'bg-red-100 text-red-800 border-red-200';
  if (role === 'driver') return 'bg-purple-100 text-purple-800 border-purple-200';
  return 'bg-blue-100 text-blue-800 border-blue-200';
};

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
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Count */}
      <p className="text-muted-foreground text-xs font-mono uppercase tracking-wide px-0.5">
        {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
      </p>

      {/* User Cards */}
      <div className="space-y-2">
        {filteredUsers.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card
              className="border-border hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]"
              onClick={() => setSelectedUser(user)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold text-sm truncate">
                      {user.full_name || 'No Name'}
                    </p>
                    <p className="text-muted-foreground text-xs truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`${roleBadge(user.role)} border text-[10px] px-2 py-0.5`}>
                      {user.role}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No users found</p>
          </div>
        )}
      </div>

      {/* User Details Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                {selectedUser.full_name || 'User Details'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 mt-2">
              {/* Account Info */}
              <Card className="border-border">
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wide">Account</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium text-foreground text-right truncate max-w-[60%]">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Role</span>
                      <Badge className={`${roleBadge(selectedUser.role)} border capitalize`}>{selectedUser.role}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Joined</span>
                      <span className="font-medium text-foreground">{format(new Date(selectedUser.created_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Locker */}
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wide mb-3">Locker</p>
                  {userLocker ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Number</span>
                        <span className="font-bold text-green-600 text-lg">#{userLocker.locker_number}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className="bg-green-100 text-green-800 border-green-200 border capitalize">{userLocker.status}</Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No active locker</p>
                  )}
                </CardContent>
              </Card>

              {/* Subscription */}
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wide mb-3">Subscription</p>
                  {userSubscription ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Plan</span>
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 border capitalize">{userSubscription.plan}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-medium text-foreground">${userSubscription.monthly_price?.toFixed(2) || '0.00'}/mo</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No active subscription</p>
                  )}
                </CardContent>
              </Card>

              {/* Payment History */}
              {userPayments.length > 0 && (
                <Card className="border-border">
                  <CardContent className="p-4">
                    <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wide mb-3">
                      Payment History ({userPayments.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {userPayments.map((payment) => (
                        <div key={payment.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                          <span className="text-muted-foreground">{format(new Date(payment.created_date), 'MMM d, yyyy')}</span>
                          <span className="text-green-600 font-semibold">${payment.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}