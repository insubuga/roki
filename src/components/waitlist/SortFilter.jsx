import React from 'react';

const OPTIONS = [
  { value: 'signups', label: 'Most Users' },
  { value: 'growth', label: 'Fastest Growth' },
  { value: 'referrals', label: 'Most Referrals' },
];

export default function SortFilter({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-600 text-xs font-mono uppercase tracking-wider">Sort:</span>
      <div className="flex gap-1.5">
        {OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              value === o.value
                ? 'bg-green-500/20 border-green-500/40 text-green-400'
                : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-white'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}