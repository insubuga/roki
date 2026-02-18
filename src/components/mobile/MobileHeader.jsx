import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function MobileHeader({ title, subtitle, icon: Icon, iconColor = 'text-[var(--color-primary)]' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(createPageUrl('Dashboard'));
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Button 
        variant="ghost" 
        size="icon" 
        className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] select-none"
        onClick={handleBack}
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