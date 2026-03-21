import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '@/lib/NavigationStack';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function MobileHeader({ title, subtitle, icon: Icon, iconColor = 'text-[var(--color-primary)]', showBack = true, backTo }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(createPageUrl('Dashboard'));
    }
  };

  return (
    <div className="flex items-center gap-3 mb-6">
      {showBack && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBack}
          aria-label={backTo ? `Back to ${backTo.replace('/', '')}` : 'Go back'}
          className="text-foreground hover:text-green-600 select-none -ml-2 flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 select-none" aria-hidden="true" />
        </Button>
      )}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor === 'text-[var(--color-primary)]' ? 'bg-green-600/20' : 'bg-gray-100'}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="text-foreground text-xl font-bold truncate">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}