import React from 'react';

export default function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-white text-xl font-bold">{title}</h2>
      {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
    </div>
  );
}