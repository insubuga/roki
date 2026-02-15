import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Lock, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
      <Card className="bg-[#1a2332] border-gray-800">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-bold">Gym Locations</h2>
            <p className="text-gray-400 text-sm">Manage gym locations and locker inventory</p>
          </div>
          <Button
            onClick={() => setShowAddGym(true)}
            className="bg-[#7cfc00] text-black hover:bg-[#6be600]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Gym
          </Button>
        </CardContent>
      </Card>

      {/* Gyms Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {gyms.map((gym) => {
          const gymLockers = queryClient.getQueryData(['gymLockers', gym.id]) || [];
          const available = gymLockers.filter(l => l.status === 'available').length;
          const claimed = gymLockers.filter(l => l.status === 'claimed').length;
          
          return (
            <Card
              key={gym.id}
              className="bg-[#1a2332] border-gray-800 cursor-pointer hover:border-gray-600 transition-colors"
              onClick={() => setSelectedGym(gym)}
            >
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#7cfc00]" />
                  {gym.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">{gym.address}</p>
                  <p className="text-gray-500 text-xs mt-1">{gym.city}</p>
                </div>
                <div className="flex items-center gap-4 pt-3 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-500" />
                    <span className="text-white text-sm">{available} Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-500" />
                    <span className="text-white text-sm">{claimed} Claimed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Gym Dialog */}
      <Dialog open={showAddGym} onOpenChange={setShowAddGym}>
        <DialogContent className="bg-[#1a2332] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Add New Gym Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-gray-400">Gym Name</Label>
              <Input
                value={newGym.name}
                onChange={(e) => setNewGym({ ...newGym, name: e.target.value })}
                className="bg-[#0d1320] border-gray-700 text-white mt-1"
                placeholder="Planet Fitness"
              />
            </div>
            <div>
              <Label className="text-gray-400">Address</Label>
              <Input
                value={newGym.address}
                onChange={(e) => setNewGym({ ...newGym, address: e.target.value })}
                className="bg-[#0d1320] border-gray-700 text-white mt-1"
                placeholder="123 Main St, New York, NY 10001"
              />
            </div>
            <div>
              <Label className="text-gray-400">City</Label>
              <Input
                value={newGym.city}
                onChange={(e) => setNewGym({ ...newGym, city: e.target.value })}
                className="bg-[#0d1320] border-gray-700 text-white mt-1"
                placeholder="New York"
              />
            </div>
            <div>
              <Label className="text-gray-400">Total Lockers</Label>
              <Input
                type="number"
                value={newGym.total_lockers}
                onChange={(e) => setNewGym({ ...newGym, total_lockers: parseInt(e.target.value) })}
                className="bg-[#0d1320] border-gray-700 text-white mt-1"
                min="1"
                max="200"
              />
            </div>
            <Button
              onClick={() => addGymMutation.mutate()}
              disabled={!newGym.name || !newGym.address || addGymMutation.isPending}
              className="w-full bg-[#7cfc00] text-black hover:bg-[#6be600]"
            >
              {addGymMutation.isPending ? 'Adding...' : 'Add Gym'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gym Details Dialog */}
      {selectedGym && (
        <Dialog open={!!selectedGym} onOpenChange={() => setSelectedGym(null)}>
          <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#7cfc00]" />
                {selectedGym.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm">{selectedGym.address}</p>
                <p className="text-gray-500 text-xs mt-1">{selectedGym.city}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-[#0d1320] border-gray-700">
                  <CardContent className="pt-4 text-center">
                    <p className="text-gray-400 text-xs">Available</p>
                    <p className="text-green-500 text-2xl font-bold">{lockerStats.available || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#0d1320] border-gray-700">
                  <CardContent className="pt-4 text-center">
                    <p className="text-gray-400 text-xs">Claimed</p>
                    <p className="text-orange-500 text-2xl font-bold">{lockerStats.claimed || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#0d1320] border-gray-700">
                  <CardContent className="pt-4 text-center">
                    <p className="text-gray-400 text-xs">Maintenance</p>
                    <p className="text-red-500 text-2xl font-bold">{lockerStats.maintenance || 0}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-3">Locker Inventory</h3>
                <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
                  {gymLockers.map((locker) => (
                    <div
                      key={locker.id}
                      className={`p-2 rounded text-center text-xs ${
                        locker.status === 'available' ? 'bg-green-500/20 text-green-500' :
                        locker.status === 'claimed' ? 'bg-orange-500/20 text-orange-500' :
                        'bg-red-500/20 text-red-500'
                      }`}
                    >
                      #{locker.locker_number}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}