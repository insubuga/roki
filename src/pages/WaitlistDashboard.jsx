import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import GymActivationTable from '@/components/waitlist/GymActivationTable';
import TopReferrers from '@/components/waitlist/TopReferrers';
import DemandStats from '@/components/waitlist/DemandStats';
import GymDetailModal from '@/components/waitlist/GymDetailModal';

export default function WaitlistDashboard() {
  const [selectedGym, setSelectedGym] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['waitlist-all'],
    queryFn: () => base44.entities.Waitlist.list('-created_date', 1000),
    refetchInterval: 30000,
  });

  if (!user) return (
    <div className="min-h-screen bg-[#080d14] flex items-center justify-center">
      <p className="text-gray-500 font-mono text-sm">Checking access...</p>
    </div>
  );

  if (user.role !== 'admin') return (
    <div className="min-h-screen bg-[#080d14] flex items-center justify-center">
      <p className="text-red-400 font-mono text-sm">Access denied. Admins only.</p>
    </div>
  );

  // Process gym data
  const gymMap = {};
  const now = Date.now();
  const h24 = now - 24 * 60 * 60 * 1000;
  const h48 = now - 48 * 60 * 60 * 1000;
  const d7  = now - 7  * 24 * 60 * 60 * 1000;

  entries.forEach(e => {
    const gym = (e.gym_name || 'Unknown').trim();
    if (!gymMap[gym]) {
      gymMap[gym] = { name: gym, entries: [], referrals: 0, new24h: 0, new48h: 0, new7d: 0 };
    }
    gymMap[gym].entries.push(e);
    gymMap[gym].referrals += (e.referral_count || 0);
    const t = new Date(e.created_date).getTime();
    if (t > h24) gymMap[gym].new24h++;
    if (t > h48) gymMap[gym].new48h++;
    if (t > d7)  gymMap[gym].new7d++;
  });

  const gyms = Object.values(gymMap).sort((a, b) => b.entries.length - a.entries.length);

  return (
    <div className="min-h-screen bg-[#080d14] text-white p-6 pt-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-1">Internal · Admin Only</p>
          <h1 className="text-3xl font-black text-white">Waitlist Intelligence</h1>
          <p className="text-gray-500 text-sm mt-1">
            {entries.length} total signups across {gyms.length} gyms — updates every 30s
          </p>
        </div>

        {/* Summary Stats */}
        <DemandStats entries={entries} gyms={gyms} />

        {/* Gym Activation Table */}
        <section>
          <h2 className="text-white font-bold text-lg mb-4">Gym Activation Readiness</h2>
          <GymActivationTable gyms={gyms} onSelectGym={setSelectedGym} isLoading={isLoading} />
        </section>

        {/* Top Referrers */}
        <section>
          <h2 className="text-white font-bold text-lg mb-4">Top Growth Drivers</h2>
          <TopReferrers entries={entries} />
        </section>
      </div>

      {selectedGym && (
        <GymDetailModal
          gym={selectedGym}
          entries={entries.filter(e => (e.gym_name || '').toLowerCase() === selectedGym.name.toLowerCase())}
          onClose={() => setSelectedGym(null)}
        />
      )}
    </div>
  );
}