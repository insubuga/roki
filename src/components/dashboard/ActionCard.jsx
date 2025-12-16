import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { motion } from 'framer-motion';

export default function ActionCard({ 
  icon: Icon, 
  title, 
  subtitle, 
  page, 
  iconBg, 
  badge,
  badgeColor = 'bg-green-500'
}) {
  return (
    <Link to={createPageUrl(page)}>
      <motion.div 
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="bg-[#1a2332] rounded-xl p-6 hover:bg-[#1f2a3d] transition-all cursor-pointer relative group border border-gray-800 hover:border-gray-700"
      >
        {badge && (
          <span className={`absolute top-3 right-3 ${badgeColor} text-white text-xs px-2 py-0.5 rounded-full font-medium`}>
            {badge}
          </span>
        )}
        <div className={`w-14 h-14 ${iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-white font-semibold text-lg">{title}</h3>
        <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
      </motion.div>
    </Link>
  );
}