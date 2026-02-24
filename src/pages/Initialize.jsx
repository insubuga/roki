import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/mobile/MobileSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, MapPin, Calendar, Shirt, Lock, Zap, Radio, Activity, Server } from 'lucide-react';
import { toast } from 'sonner';

export default function Initialize() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState(null);
  
  // Form state
  const [selectedGymId, setSelectedGymId] = useState('');
  const [workoutFrequency, setWorkoutFrequency] = useState('');
  const [gearVolume, setGearVolume] = useState('');
  const [preferredPickupDay, setPreferredPickupDay] = useState('');
  const [assignedLockerId, setAssignedLockerId] = useState(null);
  const [subscriptionTier, setSubscriptionTier] = useState('core');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Check if already initialized
        const prefs = await base44.entities.MemberPreferences.filter({ user_email: userData.email });
        if (prefs.length > 0) {
          navigate(createPageUrl('Dashboard'));
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [navigate]);

  const { data: gyms = [] } = useQuery({
    queryKey: ['gyms'],
    queryFn: () => base44.entities.Gym.list(),
    enabled: !!user,
  });

  const { data: availableLockers = [] } = useQuery({
    queryKey: ['availableLockers', selectedGymId],
    queryFn: () => base44.entities.Locker.filter({ gym_id: selectedGymId, status: 'available' }),
    enabled: !!selectedGymId,
  });

  const assignLockerMutation = useMutation({
    mutationFn: async () => {
      if (availableLockers.length === 0) throw new Error('No nodes available for assignment');
      
      const locker = availableLockers[0];
      await base44.entities.Locker.update(locker.id, {
        status: 'claimed',
        user_email: user.email
      });
      
      return locker;
    },
    onSuccess: (locker) => {
      setAssignedLockerId(locker.id);
      setCurrentStep(5);
    },
    onError: () => toast.error('Node assignment failed'),
  });

  const provisionSystemMutation = useMutation({
    mutationFn: async () => {
      // Create MemberPreferences
      await base44.entities.MemberPreferences.create({
        user_email: user.email,
        assigned_locker_id: assignedLockerId,
        preferred_pickup_days: [preferredPickupDay],
        laundry_schedule: `weekly_${preferredPickupDay}`,
        preferred_pickup_window: 'evening',
        total_cycles_completed: 0,
        total_deliveries_received: 0,
        route_density_contribution: 0,
        average_cleanliness_score: 0
      });

      // Initialize ReliabilityScore
      await base44.entities.ReliabilityScore.create({
        entity_type: 'user',
        entity_id: user.email,
        overall_score: 100,
        sla_adherence_rate: 100,
        on_time_delivery_rate: 100,
        incident_count_30d: 0,
        mean_time_to_recovery_minutes: 0,
        uptime_percentage: 100,
        quality_score_avg: 5.0,
        efficiency_score: 100,
        network_contribution_score: 0,
        trend: 'stable',
        last_calculated: new Date().toISOString()
      });

      // Activate Subscription
      await base44.entities.Subscription.create({
        user_email: user.email,
        plan: subscriptionTier,
        status: 'active',
        monthly_price: subscriptionTier === 'core' ? 89 : 139,
        laundry_credits: subscriptionTier === 'core' ? 4 : 8,
        laundry_credits_used: 0,
        laundry_turnaround_hours: subscriptionTier === 'core' ? 48 : 24,
        premium_sneaker_cleaning: subscriptionTier === 'priority',
        sneaker_cleaning_discount: subscriptionTier === 'priority' ? 100 : 0,
        rush_deliveries_included: subscriptionTier === 'priority' ? 2 : 0,
        rush_deliveries_used: 0,
        rush_delivery_fee: 15,
        priority_dispatch: subscriptionTier === 'priority',
        priority_locker: subscriptionTier === 'priority',
      });

      // Log initialization event
      await base44.entities.PerformanceLog.create({
        log_type: 'cycle_completion',
        entity_type: 'user',
        entity_id: user.email,
        metric_name: 'system_initialization',
        metric_value: 1,
        target_value: 1,
        performance_grade: 'excellent',
        time_period: 'initial',
        network_density_factor: 0,
        notes: `System provisioned: ${subscriptionTier} tier, ${gearVolume} volume, ${workoutFrequency} frequency`
      });
    },
    onSuccess: () => {
      setCurrentStep(7);
      setTimeout(() => {
        navigate(createPageUrl('Dashboard'));
      }, 2500);
    },
    onError: () => toast.error('System provisioning failed'),
  });

  const handleNext = () => {
    if (currentStep === 4) {
      assignLockerMutation.mutate();
    } else if (currentStep === 6) {
      provisionSystemMutation.mutate();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return selectedGymId;
    if (currentStep === 2) return workoutFrequency;
    if (currentStep === 3) return gearVolume;
    if (currentStep === 4) return availableLockers.length > 0;
    if (currentStep === 5) return preferredPickupDay;
    if (currentStep === 6) return subscriptionTier;
    return false;
  };

  const steps = [
    { number: 1, title: 'Gym Location', icon: MapPin },
    { number: 2, title: 'Frequency', icon: Activity },
    { number: 3, title: 'Volume', icon: Shirt },
    { number: 4, title: 'Node', icon: Lock },
    { number: 5, title: 'Schedule', icon: Calendar },
    { number: 6, title: 'Subscription', icon: Zap },
    { number: 7, title: 'Activation', icon: Server },
  ];

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-mono">AUTHENTICATING</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Radio className="w-5 h-5 text-green-600 animate-pulse" />
            <h1 className="text-2xl font-bold font-mono text-foreground">SYSTEM PROVISIONING</h1>
          </div>
          <p className="text-muted-foreground text-sm font-mono">Configuring Your Readiness Network</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isComplete = currentStep > step.number;
              const isCurrent = currentStep === step.number;
              
              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all font-mono text-sm ${
                      isComplete ? 'bg-green-600 text-white' :
                      isCurrent ? 'bg-purple-600 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-[10px] mt-1 font-mono uppercase ${isCurrent ? 'font-bold text-foreground' : 'text-muted-foreground'} hidden sm:block`}>
                      {step.title}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 transition-all ${isComplete ? 'bg-green-600' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-mono flex items-center gap-2 uppercase">
              {steps[currentStep - 1] && React.createElement(steps[currentStep - 1].icon, { className: "w-5 h-5 text-purple-600" })}
              {steps[currentStep - 1]?.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Gym Location */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <Label className="text-foreground font-mono text-sm uppercase">Primary Node Location</Label>
                <MobileSelect
                  options={gyms.map(gym => ({
                    value: gym.id,
                    label: gym.name,
                    subtitle: gym.address
                  }))}
                  value={selectedGymId}
                  onValueChange={setSelectedGymId}
                  placeholder="Select facility"
                  trigger={
                    <Select value={selectedGymId} onValueChange={setSelectedGymId}>
                      <SelectTrigger className="bg-muted border-border font-mono">
                        <SelectValue placeholder="Select facility" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {gyms.map((gym) => (
                          <SelectItem key={gym.id} value={gym.id}>
                            <div>
                              <p className="font-medium font-mono">{gym.name}</p>
                              <p className="text-xs text-muted-foreground">{gym.address}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  }
                />
              </div>
            )}

            {/* Step 2: Workout Frequency */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <Label className="text-foreground font-mono text-sm uppercase">Estimated Workout Frequency</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['2-3x/week', '4-5x/week', '6-7x/week', 'Daily+'].map((freq) => (
                    <Button
                      key={freq}
                      variant={workoutFrequency === freq ? 'default' : 'outline'}
                      className={`h-20 font-mono ${workoutFrequency === freq ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                      onClick={() => setWorkoutFrequency(freq)}
                    >
                      {freq}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Gear Volume */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <Label className="text-foreground font-mono text-sm uppercase">Estimated Garment Volume Per Week</Label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { value: 'light', label: 'LIGHT', desc: '3-5 items per week', metrics: 'Low load factor' },
                    { value: 'medium', label: 'MEDIUM', desc: '6-10 items per week', metrics: 'Standard capacity' },
                    { value: 'heavy', label: 'HEAVY', desc: '11-15 items per week', metrics: 'High throughput' },
                    { value: 'athlete', label: 'ATHLETE', desc: '16+ items per week', metrics: 'Maximum utilization' }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={gearVolume === option.value ? 'default' : 'outline'}
                      className={`h-auto p-4 flex flex-col items-start font-mono ${gearVolume === option.value ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                      onClick={() => setGearVolume(option.value)}
                    >
                      <span className="font-bold text-sm">{option.label}</span>
                      <span className="text-xs opacity-90">{option.desc}</span>
                      <span className="text-[10px] opacity-70 mt-1">{option.metrics}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Node Assignment */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-lg p-6 border border-purple-200 dark:border-purple-900/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                      <Lock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-foreground font-bold font-mono">LOCKER NODE ASSIGNMENT</p>
                      <p className="text-muted-foreground text-xs font-mono">Dedicated pickup/delivery point</p>
                    </div>
                  </div>
                  
                  {availableLockers.length > 0 ? (
                    <div className="bg-card rounded-lg p-4 border border-border">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <p className="text-muted-foreground text-xs uppercase font-mono mb-1">Available</p>
                          <p className="text-foreground font-bold text-2xl font-mono">{availableLockers.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs uppercase font-mono mb-1">Status</p>
                          <p className="text-green-600 font-bold text-2xl font-mono">READY</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-card rounded-lg p-4 border border-red-600/50 text-center">
                      <p className="text-red-600 font-mono text-sm">NO NODES AVAILABLE</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Schedule */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <Label className="text-foreground font-mono text-sm uppercase">Route Window (Pickup Day)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => (
                    <Button
                      key={day}
                      variant={preferredPickupDay === day ? 'default' : 'outline'}
                      className={`h-16 capitalize font-mono ${preferredPickupDay === day ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                      onClick={() => setPreferredPickupDay(day)}
                    >
                      {day.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Subscription Tier */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <Label className="text-foreground font-mono text-sm uppercase">Readiness Tier</Label>
                <div className="grid grid-cols-1 gap-4">
                  <Button
                    variant={subscriptionTier === 'core' ? 'default' : 'outline'}
                    className={`h-auto p-6 flex flex-col items-start font-mono ${subscriptionTier === 'core' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                    onClick={() => setSubscriptionTier('core')}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="font-bold text-lg">CORE</span>
                      <Badge className="bg-blue-600 text-white font-mono">$89/mo</Badge>
                    </div>
                    <div className="space-y-1 text-xs opacity-90 text-left">
                      <p>• 4 monthly cycles</p>
                      <p>• 48hr turnaround SLA</p>
                      <p>• Standard node access</p>
                      <p>• Route density optimization</p>
                    </div>
                  </Button>
                  
                  <Button
                    variant={subscriptionTier === 'priority' ? 'default' : 'outline'}
                    className={`h-auto p-6 flex flex-col items-start font-mono border-2 ${subscriptionTier === 'priority' ? 'bg-purple-600 hover:bg-purple-700 border-purple-600' : 'border-orange-600'}`}
                    onClick={() => setSubscriptionTier('priority')}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="font-bold text-lg">PRIORITY</span>
                      <Badge className="bg-orange-600 text-white font-mono">$139/mo</Badge>
                    </div>
                    <div className="space-y-1 text-xs opacity-90 text-left">
                      <p>• 8 monthly cycles</p>
                      <p>• 24hr turnaround SLA</p>
                      <p>• Priority dispatch queue</p>
                      <p>• 2 emergency rush deliveries</p>
                      <p>• Premium sneaker cleaning included</p>
                    </div>
                  </Button>
                </div>
              </div>
            )}

            {/* Step 7: Activation */}
            {currentStep === 7 && (
              <div className="space-y-6 text-center py-8">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Server className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2 font-mono">READINESS INFRASTRUCTURE ACTIVATED</h2>
                  <p className="text-muted-foreground font-mono text-sm">System operational — network configured</p>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg p-6 border border-green-200 dark:border-green-900/50">
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">NETWORK NODE</span>
                      <Badge className="bg-green-600 text-white">ASSIGNED</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">ROUTE WINDOW</span>
                      <Badge className="bg-purple-600 text-white capitalize">{preferredPickupDay}S</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">SLA TARGET</span>
                      <Badge className="bg-blue-600 text-white">{subscriptionTier === 'core' ? '48HR' : '24HR'}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">TIER</span>
                      <Badge className={subscriptionTier === 'priority' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}>{subscriptionTier.toUpperCase()}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {currentStep < 7 && (
              <div className="flex gap-3 pt-4">
                {currentStep > 1 && currentStep !== 5 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex-1 font-mono"
                  >
                    BACK
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || assignLockerMutation.isPending || provisionSystemMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 font-mono"
                >
                  {assignLockerMutation.isPending || provisionSystemMutation.isPending ? (
                    'PROCESSING...'
                  ) : currentStep === 6 ? (
                    'ACTIVATE'
                  ) : currentStep === 4 ? (
                    'ASSIGN NODE'
                  ) : (
                    'CONTINUE'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}