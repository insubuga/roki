import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/mobile/MobileSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, MapPin, Calendar, Shirt, Lock, Zap, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState(null);
  
  // Form state
  const [selectedGymId, setSelectedGymId] = useState('');
  const [workoutFrequency, setWorkoutFrequency] = useState('');
  const [gearVolume, setGearVolume] = useState('');
  const [preferredPickupDay, setPreferredPickupDay] = useState('');
  const [assignedLockerId, setAssignedLockerId] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

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
      if (availableLockers.length === 0) throw new Error('No lockers available');
      
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
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      // Create member preferences
      await base44.entities.MemberPreferences.create({
        user_email: user.email,
        assigned_locker_id: assignedLockerId,
        preferred_pickup_days: [preferredPickupDay],
        laundry_schedule: `weekly_${preferredPickupDay}`,
        total_cycles_completed: 0,
        total_deliveries_received: 0,
        route_density_contribution: 0,
        average_cleanliness_score: 0
      });

      // Create initial reliability score
      await base44.entities.ReliabilityScore.create({
        entity_type: 'user',
        entity_id: user.email,
        overall_score: 100,
        sla_adherence_rate: 100,
        on_time_delivery_rate: 100,
        incident_count_30d: 0,
        uptime_percentage: 100,
        quality_score_avg: 5.0,
        efficiency_score: 100,
        network_contribution_score: 0,
        trend: 'stable',
        last_calculated: new Date().toISOString()
      });
    },
    onSuccess: () => {
      setCurrentStep(6);
      setTimeout(() => {
        navigate(createPageUrl('Dashboard'));
      }, 2000);
    },
  });

  const handleNext = () => {
    if (currentStep === 4) {
      assignLockerMutation.mutate();
    } else if (currentStep === 5) {
      completeOnboardingMutation.mutate();
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
    return false;
  };

  const steps = [
    { number: 1, title: 'Gym Location', icon: MapPin },
    { number: 2, title: 'Workout Frequency', icon: Calendar },
    { number: 3, title: 'Gear Volume', icon: Shirt },
    { number: 4, title: 'Node Assignment', icon: Lock },
    { number: 5, title: 'Schedule', icon: Calendar },
    { number: 6, title: 'Activation', icon: Zap },
  ];

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
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
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isComplete ? 'bg-green-600 text-white' :
                      isCurrent ? 'bg-purple-600 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs mt-1 ${isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'} hidden sm:block`}>
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
            <CardTitle className="text-2xl flex items-center gap-2">
              {steps[currentStep - 1] && React.createElement(steps[currentStep - 1].icon, { className: "w-6 h-6 text-purple-600" })}
              {steps[currentStep - 1]?.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Gym Location */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <Label className="text-foreground font-medium">Select Your Primary Gym</Label>
                <MobileSelect
                  options={gyms.map(gym => ({
                    value: gym.id,
                    label: gym.name,
                    subtitle: gym.address
                  }))}
                  value={selectedGymId}
                  onValueChange={setSelectedGymId}
                  placeholder="Choose gym location"
                  trigger={
                    <Select value={selectedGymId} onValueChange={setSelectedGymId}>
                      <SelectTrigger className="bg-muted border-border">
                        <SelectValue placeholder="Choose gym location" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {gyms.map((gym) => (
                          <SelectItem key={gym.id} value={gym.id}>
                            <div>
                              <p className="font-medium">{gym.name}</p>
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
                <Label className="text-foreground font-medium">How Often Do You Work Out?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['2-3x/week', '4-5x/week', '6-7x/week', 'Daily+'].map((freq) => (
                    <Button
                      key={freq}
                      variant={workoutFrequency === freq ? 'default' : 'outline'}
                      className={`h-20 ${workoutFrequency === freq ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
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
                <Label className="text-foreground font-medium">Typical Activewear Volume Per Week</Label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { value: 'light', label: 'Light (3-5 items)', desc: 'Minimal gear per session' },
                    { value: 'medium', label: 'Medium (6-10 items)', desc: 'Standard workout loads' },
                    { value: 'heavy', label: 'Heavy (11-15 items)', desc: 'Multiple sessions daily' },
                    { value: 'athlete', label: 'Athlete (16+ items)', desc: 'High-volume training' }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={gearVolume === option.value ? 'default' : 'outline'}
                      className={`h-auto p-4 flex flex-col items-start ${gearVolume === option.value ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                      onClick={() => setGearVolume(option.value)}
                    >
                      <span className="font-semibold">{option.label}</span>
                      <span className="text-xs opacity-80">{option.desc}</span>
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
                      <p className="text-foreground font-bold">Locker Node Assignment</p>
                      <p className="text-muted-foreground text-sm">Your dedicated pickup/drop-off point</p>
                    </div>
                  </div>
                  
                  {availableLockers.length > 0 ? (
                    <div className="bg-card rounded-lg p-4 border border-border">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <p className="text-muted-foreground text-xs uppercase mb-1">Available Nodes</p>
                          <p className="text-foreground font-bold text-2xl">{availableLockers.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs uppercase mb-1">Assignment</p>
                          <p className="text-green-600 font-bold text-2xl">Ready</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-card rounded-lg p-4 border border-border text-center">
                      <p className="text-muted-foreground">No nodes available at this location</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Schedule */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <Label className="text-foreground font-medium">Preferred Pickup Day</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => (
                    <Button
                      key={day}
                      variant={preferredPickupDay === day ? 'default' : 'outline'}
                      className={`h-16 capitalize ${preferredPickupDay === day ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                      onClick={() => setPreferredPickupDay(day)}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Activation */}
            {currentStep === 6 && (
              <div className="space-y-6 text-center py-8">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-2">Your Readiness System is Active.</h2>
                  <p className="text-muted-foreground">Infrastructure configured and operational.</p>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg p-6 border border-green-200 dark:border-green-900/50">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Network Node</span>
                      <Badge className="bg-green-600 text-white">Assigned</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Pickup Schedule</span>
                      <Badge className="bg-purple-600 text-white capitalize">{preferredPickupDay}s</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">SLA Guarantee</span>
                      <Badge className="bg-blue-600 text-white">48hr</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {currentStep < 6 && (
              <div className="flex gap-3 pt-4">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || assignLockerMutation.isPending || completeOnboardingMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                >
                  {assignLockerMutation.isPending || completeOnboardingMutation.isPending ? (
                    'Processing...'
                  ) : currentStep === 5 ? (
                    'Activate System'
                  ) : (
                    <>
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </>
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