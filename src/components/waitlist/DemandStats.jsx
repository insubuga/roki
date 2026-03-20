import React from 'react';

export default function DemandStats({ entries, gyms }) {
  const now = Date.now();
  const h24 = now - 24 * 60 * 60 * 1000;
  const d7  = now - 7 * 24 * 60 * 60 * 1000;

  const new24h = entries.filter(e => new Date(e.created_date).getTime() > h24).length;
  const new7d  = entries.filter(e => new Date(e.created_date).getTime() > d7).length;
  const readyGyms = gyms.filter(g => g.entries.length >= 20).length;
  const closeGyms = gyms.filter(g => g.entries.length >= 10 && g.entries.length < 20).length;

  const stats = [
    { label: 'Total Signups', value: entries.length, color: 'text-white' },
    { label: 'New (24h)', value: `+${new24h}`, color: 'text-green-400' },
    { label: 'New (7d)', value: `+${new7d}`, color: 'text-blue-400' },
    { label: 'Gyms Ready', value: readyGyms, color: 'text-green-400' },
    { label: 'Gyms Close', value: closeGyms, color: 'text-yellow-400' },
    { label: 'Total Gyms', value: gyms.length, color: 'text-white' },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4 text-center">
          <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          <p className="text-gray-500 text-xs mt-1 font-mono">{s.label}</p>
        </div>
      ))}
    </div>
  );
}