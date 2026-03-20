import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import GymActivationTable from '@/components/waitlist/GymActivationTable';
import TopReferrers from '@/components/waitlist/TopReferrers';
import DemandStats from '@/components/waitlist/DemandStats';
import GymDetailModal from '@/components/waitlist/GymDetailModal';
import GymDemandMap from '@/components/waitlist/GymDemandMap';
import SortFilter from '@/components/waitlist/SortFilter';

// Normalize gym name: lowercase, strip punctuation/spaces for dedup key
function normalizeKey(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Deduplicate entries by email (keep latest)
function deduplicateEntries(entries) {
  const seen = {};
  return entries.filter(e => {
    if (!e.email) return true;
    const key = e.email.toLowerCase();
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

// Build gym display name: pick the most common casing seen in data
function canonicalName(variants) {
  const counts = {};
  variants.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export default function WaitlistDashboard() {
  const [selectedGym, setSelectedGym] = useState(null);
  const [sortBy, setSortBy] = useState('signups');
  const [showMap, setShowMap] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {}).finally(() => setAuthChecked(true));
  }, []);

  const { data: rawEntries = [], isLoading } = useQuery({
    queryKey: ['waitlist-all'],
    queryFn: () => base44.entities.Waitlist.list('-created_date', 1000),
    refetchInterval: 30000,
    enabled: user?.role === 'admin',
  });

  const { data: gymEntities = [] } = useQuery({
    queryKey: ['gyms-all'],
    queryFn: () => base44.entities.Gym.list(),
    enabled: user?.role === 'admin',
  });

  // Deduplicate entries
  const entries = useMemo(() => deduplicateEntries(rawEntries), [rawEntries]);

  // Build normalized gym map
  const gyms = useMemo(() => {
    const gymMap = {};
    const now = Date.now();
    const h24 = now - 24 * 60 * 60 * 1000;
    const h48 = now - 48 * 60 * 60 * 1000;
    const d7  = now - 7  * 24 * 60 * 60 * 1000;

    entries.forEach(e => {
      const raw = (e.gym_name || 'Unknown').trim();
      const key = normalizeKey(raw);
      if (!gymMap[key]) {
        gymMap[key] = { key, nameVariants: [], entries: [], referrals: 0, new24h: 0, new48h: 0, new7d: 0 };
      }
      gymMap[key].nameVariants.push(raw);
      gymMap[key].entries.push(e);
      gymMap[key].referrals += (e.referral_count || 0);
      const t = new Date(e.created_date).getTime();
      if (t > h24) gymMap[key].new24h++;
      if (t > h48) gymMap[key].new48h++;
      if (t > d7)  gymMap[key].new7d++;
    });

    return Object.values(gymMap).map(g => ({
      ...g,
      name: canonicalName(g.nameVariants),
    }));
  }, [entries]);

  // Apply sort
  const sortedGyms = useMemo(() => {
    const copy = [...gyms];
    if (sortBy === 'signups')   return copy.sort((a, b) => b.entries.length - a.entries.length);
    if (sortBy === 'growth')    return copy.sort((a, b) => b.new24h - a.new24h || b.new7d - a.new7d);
    if (sortBy === 'referrals') return copy.sort((a, b) => b.referrals - a.referrals);
    return copy;
  }, [gyms, sortBy]);

  if (!authChecked) return (
    <div className="min-h-screen bg-[#080d14] flex items-center justify-center">
      <p className="text-gray-500 font-mono text-sm">Checking access...</p>
    </div>
  );

  if (!user || user.role !== 'admin') return (
    <div className="min-h-screen bg-[#080d14] flex items-center justify-center">
      <p className="text-red-400 font-mono text-sm">Access denied. Admins only.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080d14] text-white p-6 pt-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-1">Internal · Admin Only</p>
            <h1 className="text-3xl font-black text-white">Waitlist Intelligence</h1>
            <p className="text-gray-500 text-sm mt-1">
              {entries.length} unique signups across {gyms.length} gyms — auto-refreshes every 30s
            </p>
          </div>
          <button
            onClick={() => setShowMap(m => !m)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              showMap
                ? 'bg-green-500/20 border-green-500/40 text-green-400'
                : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
            }`}
          >
            {showMap ? '✕ Hide Map' : '🗺 Gym Map'}
          </button>
        </div>

        {/* Summary Stats */}
        <DemandStats entries={entries} gyms={gyms} />

        {/* Map */}
        {showMap && (
          <section>
            <h2 className="text-white font-bold text-lg mb-4">Demand Map</h2>
            <GymDemandMap gyms={sortedGyms} gymEntities={gymEntities} onSelectGym={setSelectedGym} />
          </section>
        )}

        {/* Gym Activation Table */}
        <section>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-white font-bold text-lg">Gym Activation Readiness</h2>
            <SortFilter value={sortBy} onChange={setSortBy} />
          </div>
          <GymActivationTable gyms={sortedGyms} onSelectGym={setSelectedGym} isLoading={isLoading} />
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
          entries={entries.filter(e => normalizeKey(e.gym_name) === selectedGym.key)}
          onClose={() => setSelectedGym(null)}
        />
      )}
    </div>
  );
}