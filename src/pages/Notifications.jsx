import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, Package, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const PREF_KEY = 'roki_notification_prefs';

const defaultPrefs = {
  cycle_status: true,
  locker_ready: true,
  rush_alerts: true,
  incident_alerts: true,
  subscription_reminders: true,
  marketing: false,
};

export default function Notifications() {
  const [user, setUser] = useState(null);
  const [prefs, setPrefs] = useState(defaultPrefs);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser({}));
    const saved = localStorage.getItem(PREF_KEY);
    if (saved) setPrefs(JSON.parse(saved));
  }, []);

  const togglePref = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const save = () => {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    toast.success('Notification preferences saved');
  };

  const items = [
    { key: 'cycle_status', icon: Package, label: 'Cycle Status Updates', desc: 'Washing, drying, and ready alerts' },
    { key: 'locker_ready', icon: CheckCircle, label: 'Locker Ready', desc: 'When your clean gear is in the locker' },
    { key: 'rush_alerts', icon: Zap, label: 'Rush & Recovery', desc: 'Emergency credit usage and dispatch confirmations' },
    { key: 'incident_alerts', icon: AlertTriangle, label: 'Incident Alerts', desc: 'System incidents affecting your cycles' },
    { key: 'subscription_reminders', icon: Bell, label: 'Subscription Reminders', desc: 'Renewal and credit reset notifications' },
    { key: 'marketing', icon: Bell, label: 'Tips & Updates', desc: 'Product updates and service announcements' },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/Configuration">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-foreground text-xl font-bold font-mono">NOTIFICATIONS</h1>
          <p className="text-muted-foreground text-xs font-mono">Alert preferences and communication settings</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <Bell className="w-4 h-4 text-green-600" />
            ALERT PREFERENCES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <ItemIcon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-foreground text-sm font-mono font-medium">{item.label}</p>
                    <p className="text-muted-foreground text-xs font-mono">{item.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => togglePref(item.key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${prefs[item.key] ? 'bg-green-600' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${prefs[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button
        onClick={save}
        className="bg-green-600 hover:bg-green-700 text-white font-mono text-sm font-bold w-full"
      >
        SAVE PREFERENCES
      </Button>
    </div>
  );
}