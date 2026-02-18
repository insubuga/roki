import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function MobileHeader({ title, subtitle, icon: Icon, iconColor = 'text-[var(--color-primary)]' }) {
  return (
    <div className="flex items-center gap-4">
      <Link to={createPageUrl('Dashboard')}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] select-none"
        >
          <ArrowLeft className="w-5 h-5 select-none" />
        </Button>
      </Link>
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
          {Icon && <Icon className={`w-8 h-8 ${iconColor}`} />}
          {title}
        </h1>
        {subtitle && <p className="text-[var(--color-text-secondary)] mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}