import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  User,
  Search,
  Star,
  TrendingUp,
  Package,
  CheckCircle2,
  Clock,
  Ban,
  PlayCircle,
  Mail,
  Phone,
  MapPin,
  AlertTriangle,
  Activity,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function DriverManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [actionDriver, setActionDriver] = useState(null);
  const [actionType, setActionType] = useState(null);
  const queryClient = useQueryClient();

  // Fetch all users with driver role
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.asServiceRole.entities.User.list(),
  });

  const drivers = allUsers.filter(u => u.role === 'driver' || u.role === 'admin');

  // Fetch driver stats
  const { data: driverStats = [] } = useQuery({
    queryKey: ['allDriverStats'],
    queryFn: () => base44.entities.DriverStats.list(),
  });

  // Fetch all orders to calculate active/completed
  const { data: orders = [] } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => base44.entities.Order.list(),
  });

  // Deactivate/Reactivate driver mutation
  const toggleDriverMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      await base44.asServiceRole.entities.User.update(userId, { role: newRole });
      
      // Create notification
      const driver = drivers.find(d => d.id === userId);
      await base44.entities.Notification.create({
        user_email: driver.email,
        type: 'system',
        title: newRole === 'user' ? 'Driver Access Suspended' : 'Driver Access Restored',
        message: newRole === 'user' 
          ? 'Your driver account has been suspended. Please contact support for details.'
          : 'Your driver account has been reactivated. You can now accept deliveries.',
        priority: 'high'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success('Driver status updated');
      setActionDriver(null);
      setActionType(null);
    },
  });

  // Get driver stats for a specific driver
  const getDriverStats = (driverEmail) => {
    return driverStats.find(s => s.driver_email === driverEmail) || {
      total_deliveries: 0,
      total_earnings: 0,
      average_rating: 0,
      on_time_percentage: 0,
      acceptance_rate: 0,
      completion_rate: 0
    };
  };

  // Get active and completed deliveries for driver
  const getDriverOrders = (driverEmail) => {
    const driverOrders = orders.filter(o => o.driver_email === driverEmail);
    const active = driverOrders.filter(o => o.status === 'in_transit').length;
    const completed = driverOrders.filter(o => o.status === 'delivered').length;
    return { active, completed };
  };

  // Filter drivers
  const filteredDrivers = drivers.filter(d =>
    d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totalDrivers = drivers.length;
  const activeDrivers = filteredDrivers.filter(d => d.role === 'driver' || d.role === 'admin').length;
  const suspendedDrivers = filteredDrivers.filter(d => d.role === 'user' && 
    driverStats.some(s => s.driver_email === d.email)).length;

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-gray-200 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Total Drivers</p>
                <p className="text-gray-900 text-3xl font-bold">{totalDrivers}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Active Drivers</p>
                <p className="text-gray-900 text-3xl font-bold">{activeDrivers}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                <Activity className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Suspended</p>
                <p className="text-gray-900 text-3xl font-bold">{suspendedDrivers}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
                <Ban className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search drivers by name or email..."
              className="pl-12 h-12 border-gray-300"
            />
          </div>
        </CardContent>
      </Card>

      {/* Drivers List */}
      <div className="space-y-4">
        {filteredDrivers.map((driver, index) => {
          const stats = getDriverStats(driver.email);
          const { active, completed } = getDriverOrders(driver.email);
          const isActive = driver.role === 'driver' || driver.role === 'admin';
          const hasDriverStats = driverStats.some(s => s.driver_email === driver.email);

          return (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-gray-200 hover:shadow-xl transition-all duration-300 group overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${
                  isActive ? 'from-green-500 to-emerald-600' : 'from-red-500 to-red-600'
                }`}></div>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Driver Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-16 h-16 bg-gradient-to-br rounded-2xl flex items-center justify-center shadow-md ${
                        isActive ? 'from-green-500 to-emerald-600' : 'from-gray-400 to-gray-500'
                      }`}>
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 text-lg">{driver.full_name || 'Driver'}</h3>
                          <Badge className={`${
                            isActive 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-red-100 text-red-800 border-red-200'
                          } border`}>
                            {isActive ? 'Active' : 'Suspended'}
                          </Badge>
                          {driver.role === 'admin' && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 border">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-3.5 h-3.5" />
                            {driver.email}
                          </div>
                        </div>

                        {/* Performance Metrics */}
                        {hasDriverStats && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                              <div className="flex items-center gap-2 mb-1">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <span className="text-xs text-gray-600 font-medium">Rating</span>
                              </div>
                              <p className="text-lg font-bold text-gray-900">
                                {stats.average_rating?.toFixed(1) || '0.0'}
                              </p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="text-xs text-gray-600 font-medium">Completed</span>
                              </div>
                              <p className="text-lg font-bold text-gray-900">{completed}</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-4 h-4 text-orange-600" />
                                <span className="text-xs text-gray-600 font-medium">Active</span>
                              </div>
                              <p className="text-lg font-bold text-gray-900">{active}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                              <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="w-4 h-4 text-purple-600" />
                                <span className="text-xs text-gray-600 font-medium">Earnings</span>
                              </div>
                              <p className="text-lg font-bold text-gray-900">
                                ${stats.total_earnings?.toFixed(0) || '0'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDriver(driver)}
                        className="border-gray-300 hover:bg-gray-50"
                      >
                        View Details
                      </Button>
                      {driver.role !== 'admin' && (
                        <Button
                          variant={isActive ? "outline" : "default"}
                          size="sm"
                          className={
                            isActive 
                              ? "border-red-300 text-red-700 hover:bg-red-50" 
                              : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
                          }
                          onClick={() => {
                            setActionDriver(driver);
                            setActionType(isActive ? 'suspend' : 'activate');
                          }}
                        >
                          {isActive ? (
                            <>
                              <Ban className="w-4 h-4 mr-1" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-4 h-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {filteredDrivers.length === 0 && (
          <Card className="border-gray-200">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">No drivers found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Driver Details Dialog */}
      {selectedDriver && (
        <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Driver Details</DialogTitle>
            </DialogHeader>
            <DriverDetails 
              driver={selectedDriver} 
              stats={getDriverStats(selectedDriver.email)}
              orders={getDriverOrders(selectedDriver.email)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Dialog */}
      {actionDriver && (
        <AlertDialog open={!!actionDriver} onOpenChange={() => setActionDriver(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === 'suspend' ? 'Suspend Driver Account' : 'Activate Driver Account'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionType === 'suspend' 
                  ? `Are you sure you want to suspend ${actionDriver.full_name}? They will lose access to driver features and be notified immediately.`
                  : `Are you sure you want to activate ${actionDriver.full_name}? They will regain access to driver features and be notified immediately.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => toggleDriverMutation.mutate({
                  userId: actionDriver.id,
                  newRole: actionType === 'suspend' ? 'user' : 'driver'
                })}
                className={
                  actionType === 'suspend'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }
              >
                {actionType === 'suspend' ? 'Suspend Driver' : 'Activate Driver'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function DriverDetails({ driver, stats, orders }) {
  return (
    <div className="space-y-4">
      <Card className="border-gray-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent">
          <CardTitle className="text-sm text-gray-700">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Email:</span>
            <span className="font-medium text-gray-900">{driver.email}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent">
          <CardTitle className="text-sm text-gray-700">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">Average Rating</p>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-gray-900">{stats.average_rating?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Deliveries</p>
              <span className="font-bold text-gray-900">{stats.total_deliveries || 0}</span>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">On-Time Rate</p>
              <span className="font-bold text-gray-900">{stats.on_time_percentage?.toFixed(0) || 0}%</span>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Acceptance Rate</p>
              <span className="font-bold text-gray-900">{stats.acceptance_rate?.toFixed(0) || 0}%</span>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Completion Rate</p>
              <span className="font-bold text-gray-900">{stats.completion_rate?.toFixed(0) || 0}%</span>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Earnings</p>
              <span className="font-bold text-gray-900">${stats.total_earnings?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-transparent">
          <CardTitle className="text-sm text-gray-700">Current Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Active Deliveries</span>
            <Badge className="bg-orange-100 text-orange-800">{orders.active}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Completed Deliveries</span>
            <Badge className="bg-green-100 text-green-800">{orders.completed}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}