import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileHeader({ title, subtitle, icon: Icon, iconColor = 'text-[var(--color-primary)]' }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4">
      <Button 
        variant="ghost" 
        size="icon" 
        className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] select-none"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-5 h-5 select-none" />
      </Button>
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