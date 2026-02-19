import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Lock, Package, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function GymManagement() {
  const [showAddGym, setShowAddGym] = useState(false);
  const [selectedGym, setSelectedGym] = useState(null);
  const [newGym, setNewGym] = useState({ name: '', address: '', city: '', total_lockers: 50 });
  const queryClient = useQueryClient();

  const { data: gyms = [] } = useQuery({
    queryKey: ['allGyms'],
    queryFn: () => base44.entities.Gym.list('-created_date'),
  });

  const { data: gymLockers = [] } = useQuery({
    queryKey: ['gymLockers', selectedGym?.id],
    queryFn: () => base44.entities.Locker.filter({ gym_id: selectedGym?.id }),
    enabled: !!selectedGym?.id,
  });

  const addGymMutation = useMutation({
    mutationFn: async () => {
      const gym = await base44.entities.Gym.create(newGym);
      
      // Create lockers for the gym
      const lockerPromises = [];
      for (let i = 1; i <= newGym.total_lockers; i++) {
        lockerPromises.push(
          base44.entities.Locker.create({
            gym_id: gym.id,
            locker_number: String(i).padStart(3, '0'),
            access_code: String(Math.floor(1000 + Math.random() * 9000)),
            status: 'available',
            is_locked: true
          })
        );
      }
      await Promise.all(lockerPromises);
      
      return gym;
    },
    onSuccess: () => {
      toast.success('Gym added successfully!');
      queryClient.invalidateQueries({ queryKey: ['allGyms'] });
      setShowAddGym(false);
      setNewGym({ name: '', address: '', city: '', total_lockers: 50 });
    },
    onError: () => {
      toast.error('Failed to add gym');
    }
  });

  const lockerStats = gymLockers.reduce((acc, locker) => {
    acc[locker.status] = (acc[locker.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white border-gray-200 shadow-lg">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900 text-xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-green-600" />
              Gym Locations
            </h2>
            <p className="text-gray-600 text-sm mt-1">Manage gym locations and locker inventory</p>
          </div>
          <Button
            onClick={() => setShowAddGym(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Gym
          </Button>
        </CardContent>
      </Card>

      {/* Gyms Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {gyms.map((gym, index) => {
          const gymLockers = queryClient.getQueryData(['gymLockers', gym.id]) || [];
          const available = gymLockers.filter(l => l.status === 'available').length;
          const claimed = gymLockers.filter(l => l.status === 'claimed').length;
          
          return (
            <motion.div
              key={gym.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className="bg-white border-gray-200 cursor-pointer hover:shadow-2xl transition-all duration-300 group overflow-hidden"
                onClick={() => setSelectedGym(gym)}
              >
                <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
                <CardHeader className="bg-gradient-to-r from-green-50 to-transparent">
                  <CardTitle className="text-gray-900 flex items-center gap-2 group-hover:text-green-700 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    {gym.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-gray-700 text-sm font-medium">{gym.address}</p>
                    <p className="text-gray-500 text-xs mt-1">{gym.city}</p>
                  </div>
                  <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg flex-1">
                      <Lock className="w-4 h-4 text-green-600" />
                      <span className="text-gray-900 text-sm font-semibold">{available}</span>
                      <span className="text-gray-600 text-xs">Available</span>
                    </div>
                    <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg flex-1">
                      <Package className="w-4 h-4 text-orange-600" />
                      <span className="text-gray-900 text-sm font-semibold">{claimed}</span>
                      <span className="text-gray-600 text-xs">Claimed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Add Gym Dialog */}
      <Dialog open={showAddGym} onOpenChange={setShowAddGym}>
        <DialogContent className="bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Add New Gym Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-gray-700 font-medium">Gym Name</Label>
              <Input
                value={newGym.name}
                onChange={(e) => setNewGym({ ...newGym, name: e.target.value })}
                className="border-gray-300 mt-1"
                placeholder="Planet Fitness"
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium">Address</Label>
              <Input
                value={newGym.address}
                onChange={(e) => setNewGym({ ...newGym, address: e.target.value })}
                className="border-gray-300 mt-1"
                placeholder="123 Main St, New York, NY 10001"
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium">City</Label>
              <Input
                value={newGym.city}
                onChange={(e) => setNewGym({ ...newGym, city: e.target.value })}
                className="border-gray-300 mt-1"
                placeholder="New York"
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium">Total Lockers</Label>
              <Input
                type="number"
                value={newGym.total_lockers}
                onChange={(e) => setNewGym({ ...newGym, total_lockers: parseInt(e.target.value) })}
                className="border-gray-300 mt-1"
                min="1"
                max="200"
              />
            </div>
            <Button
              onClick={() => addGymMutation.mutate()}
              disabled={!newGym.name || !newGym.address || addGymMutation.isPending}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
            >
              {addGymMutation.isPending ? 'Adding...' : 'Add Gym'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gym Details Dialog */}
      {selectedGym && (
        <Dialog open={!!selectedGym} onOpenChange={() => setSelectedGym(null)}>
          <DialogContent className="bg-white border-gray-200 max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                {selectedGym.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <Card className="border-gray-200">
                <CardContent className="pt-4">
                  <p className="text-gray-700 font-medium">{selectedGym.address}</p>
                  <p className="text-gray-500 text-sm mt-1">{selectedGym.city}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-3 gap-4">
                <Card className="border-gray-200 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
                  <CardContent className="pt-4 text-center">
                    <p className="text-gray-600 text-xs font-medium mb-1">Available</p>
                    <p className="text-green-700 text-3xl font-bold">{lockerStats.available || 0}</p>
                  </CardContent>
                </Card>
                <Card className="border-gray-200 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
                  <CardContent className="pt-4 text-center">
                    <p className="text-gray-600 text-xs font-medium mb-1">Claimed</p>
                    <p className="text-orange-700 text-3xl font-bold">{lockerStats.claimed || 0}</p>
                  </CardContent>
                </Card>
                <Card className="border-gray-200 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
                  <CardContent className="pt-4 text-center">
                    <p className="text-gray-600 text-xs font-medium mb-1">Maintenance</p>
                    <p className="text-red-700 text-3xl font-bold">{lockerStats.maintenance || 0}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-gray-200">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-transparent">
                  <CardTitle className="text-gray-900 text-base">Locker Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-6 gap-2 max-h-96 overflow-y-auto">
                    {gymLockers.map((locker) => (
                      <div
                        key={locker.id}
                        className={`p-3 rounded-lg text-center text-xs font-semibold border-2 transition-all hover:scale-105 ${
                          locker.status === 'available' ? 'bg-green-50 text-green-700 border-green-200' :
                          locker.status === 'claimed' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        #{locker.locker_number}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}