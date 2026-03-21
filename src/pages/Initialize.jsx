import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { getPlanConfig } from '@/components/subscription/planConfig';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CheckCircle, MapPin, Calendar, Shirt, Lock, Zap, Activity,
  Server, AlertCircle, ChevronRight, ArrowLeft, Sparkles, Clock, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { id: 1, label: 'Your Gym', icon: MapPin },
  { id: 2, label: 'Your Volume', icon: Shirt },
  { id: 3, label: 'Your Schedule', icon: Calendar },
  { id: 4, label: 'Your Plan', icon: Zap },
  { id: 5, label: 'Locker', icon: Lock },
];

export default function Initialize() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);

  const [selectedGymId, setSelectedGymId] = useState('');
  const [gearVolume, setGearVolume] = useState('');
  const [preferredPickupDay, setPreferredPickupDay] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState('core');
  const [assignedLockerId, setAssignedLockerId] = useState(null);
  const [showExpansionRequest, setShowExpansionRequest] = useState(false);
  const [expansionGymName, setExpansionGymName] = useState('');
  const [expansionGymAddress, setExpansionGymAddress] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        const prefs = await base44.entities.MemberPreferences.filter({ user_email: userData.email });
        if (prefs.length > 0) navigate(createPageUrl('Dashboard'));
      } catch {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [navigate]);

  const { data: allGyms = [] } = useQuery({
    queryKey: ['gyms'],
    queryFn: () => base44.entities.Gym.list(),
    enabled: !!user,
  });

  const { data: allLockers = [] } = useQuery({
    queryKey: ['allLockers'],
    queryFn: () => base44.entities.Locker.list(),
    enabled: !!user,
  });

  const enabledGyms = allGyms.filter(gym => {
    const gymLockers = allLockers.filter(l => l.gym_id === gym.id);
    return gymLockers.some(l => l.status === 'available');
  });

  const { data: availableLockers = [] } = useQuery({
    queryKey: ['availableLockers', selectedGymId],
    queryFn: () => base44.entities.Locker.filter({ gym_id: selectedGymId, status: 'available' }),
    enabled: !!selectedGymId,
  });

  const selectedGym = allGyms.find(g => g.id === selectedGymId);

  const requestExpansionMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ExpansionInterest.create({
        user_email: user.email,
        requested_gym_name: expansionGymName,
        requested_gym_address: expansionGymAddress,
        status: 'pending',
        density_score: 0,
      });
    },
    onSuccess: () => {
      toast.success('Request submitted — we\'ll reach out soon!');
      setShowExpansionRequest(false);
    },
  });

  const provisionMutation = useMutation({
    mutationFn: async () => {
      // Reserve locker reference in preferences (locker stays available for cycle assignment)
      const locker = availableLockers[0];
      setAssignedLockerId(locker.id);

      // Save preferences
      await base44.entities.MemberPreferences.create({
        user_email: user.email,
        assigned_locker_id: locker.id,
        preferred_pickup_days: [preferredPickupDay],
        laundry_schedule: `weekly_${preferredPickupDay}`,
        preferred_pickup_window: 'evening',
        total_cycles_completed: 0,
        total_deliveries_received: 0,
        route_density_contribution: 0,
        average_cleanliness_score: 0,
      });

      // Init reliability score
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
        last_calculated: new Date().toISOString(),
      });

      // Create subscription from shared config
       const planConfig = getPlanConfig(subscriptionTier);
       const renewalDate = new Date();
       renewalDate.setDate(renewalDate.getDate() + 30);
       await base44.entities.Subscription.create({
         user_email: user.email,
         plan: subscriptionTier,
         status: 'active',
         monthly_price: planConfig.price,
         laundry_credits: planConfig.laundryCredits,
         laundry_credits_used: 0,
         laundry_turnaround_hours: planConfig.turnaroundHours,
         premium_sneaker_cleaning: planConfig.premiumSneakerCleaning,
         sneaker_cleaning_discount: planConfig.sneakerCleaningDiscount,
         rush_deliveries_included: planConfig.rushDeliveries,
         rush_deliveries_used: 0,
         rush_delivery_fee: planConfig.rushDeliveryFee,
         priority_dispatch: planConfig.priorityDispatch,
         priority_locker: planConfig.priorityLocker,
         renewal_date: renewalDate.toISOString().split('T')[0],
       });

      // Update user's preferred gym
      await base44.auth.updateMe({ preferred_gym: selectedGymId });

      // Welcome notification
      await base44.entities.Notification.create({
        user_email: user.email,
        type: 'system',
        title: '🎉 Welcome to ROKI!',
        message: `Your locker at ${selectedGym?.name || 'your gym'} is ready. Drop your first bag and we'll handle the rest.`,
        action_url: '/ActiveCycle',
        priority: 'high',
        read: false,
      });
    },
    onSuccess: () => {
      setDone(true);
      setTimeout(() => navigate(createPageUrl('Dashboard')), 3000);
    },
    onError: () => toast.error('Setup failed — please try again'),
  });

  const canProceed = () => {
    if (step === 1) return !!selectedGymId;
    if (step === 2) return !!gearVolume;
    if (step === 3) return !!preferredPickupDay;
    if (step === 4) return !!subscriptionTier;
    if (step === 5) return availableLockers.length > 0;
    return false;
  };

  const handleNext = () => {
    if (step === 5) {
      provisionMutation.mutate();
    } else {
      setStep(step + 1);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ✅ Done screen
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h1 className="text-3xl font-bold text-foreground mb-2">You're all set, {user.full_name?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground mb-6">Your locker is reserved. Drop your first bag and let Roki handle the rest.</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 justify-center text-green-600">
              <CheckCircle className="w-4 h-4" /> Locker node assigned at {selectedGym?.name}
            </div>
            <div className="flex items-center gap-2 justify-center text-green-600">
              <CheckCircle className="w-4 h-4" /> {subscriptionTier === 'priority' ? 'Priority' : 'Core'} plan activated
            </div>
            <div className="flex items-center gap-2 justify-center text-green-600">
              <CheckCircle className="w-4 h-4" /> Drop schedule set for {preferredPickupDay}s
            </div>
          </div>
          <p className="text-muted-foreground text-xs mt-6 animate-pulse">Taking you to your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 max-w-lg mx-auto w-full">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : <div className="w-5" />}
        <div className="flex gap-1.5">
          {STEPS.map(s => (
            <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${
              s.id < step ? 'bg-green-500 w-6' : s.id === step ? 'bg-green-500 w-8' : 'bg-muted w-4'
            }`} />
          ))}
        </div>
        <span className="text-muted-foreground text-xs font-mono">{step}/{STEPS.length}</span>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* STEP 1: Gym */}
            {step === 1 && (
              <>
                <div className="pt-4">
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-widest mb-1">Step 1 — Location</p>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Where do you train?</h2>
                  <p className="text-muted-foreground text-sm">We'll assign your locker at this facility.</p>
                </div>

                <div className="space-y-3">
                  {enabledGyms.length > 0 ? enabledGyms.map(gym => {
                    const gymLockers = allLockers.filter(l => l.gym_id === gym.id);
                    const available = gymLockers.filter(l => l.status === 'available').length;
                    const isSelected = selectedGymId === gym.id;
                    return (
                      <button
                        key={gym.id}
                        onClick={() => setSelectedGymId(gym.id)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-500/5'
                            : 'border-border bg-card hover:border-muted-foreground/40'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mt-0.5 ${isSelected ? 'bg-green-500' : 'bg-muted'}`}>
                              <MapPin className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{gym.name}</p>
                              <p className="text-muted-foreground text-xs mt-0.5">{gym.address}</p>
                              <p className="text-green-600 text-xs font-medium mt-1">{available} lockers available</p>
                            </div>
                          </div>
                          {isSelected && <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />}
                        </div>
                      </button>
                    );
                  }) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">Loading gyms...</div>
                  )}

                  <button
                    onClick={() => setShowExpansionRequest(true)}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-muted-foreground/40 transition-all text-center"
                  >
                    <p className="text-muted-foreground text-sm">Don't see your gym?</p>
                    <p className="text-green-600 text-xs font-semibold mt-0.5">Request activation →</p>
                  </button>
                </div>
              </>
            )}

            {/* STEP 2: Gear Volume */}
            {step === 2 && (
              <>
                <div className="pt-4">
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-widest mb-1">Step 2 — Volume</p>
                  <h2 className="text-2xl font-bold text-foreground mb-1">How much gear per week?</h2>
                  <p className="text-muted-foreground text-sm">This helps us optimize your locker size and route timing.</p>
                </div>
                <div className="space-y-3">
                  {[
                    { value: 'light', label: 'Light', sub: '3–5 items', icon: '🏃', detail: 'Casual gym-goer' },
                    { value: 'medium', label: 'Standard', sub: '6–10 items', icon: '💪', detail: 'Regular trainer' },
                    { value: 'heavy', label: 'Heavy', sub: '11–15 items', icon: '🔥', detail: 'Serious athlete' },
                    { value: 'athlete', label: 'Athlete', sub: '16+ items', icon: '⚡', detail: 'Elite performer' },
                  ].map(opt => {
                    const isSelected = gearVolume === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setGearVolume(opt.value)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                          isSelected ? 'border-green-500 bg-green-500/5' : 'border-border bg-card hover:border-muted-foreground/40'
                        }`}
                      >
                        <span className="text-2xl">{opt.icon}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{opt.label}</p>
                          <p className="text-muted-foreground text-xs">{opt.sub} · {opt.detail}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* STEP 3: Schedule */}
            {step === 3 && (
              <>
                <div className="pt-4">
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-widest mb-1">Step 3 — Schedule</p>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Pick your drop day.</h2>
                  <p className="text-muted-foreground text-sm">Our driver collects your bag from your locker on this day.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => {
                    const isSelected = preferredPickupDay === day;
                    return (
                      <button
                        key={day}
                        onClick={() => setPreferredPickupDay(day)}
                        className={`p-4 rounded-xl border-2 capitalize font-semibold transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-border bg-card text-foreground hover:border-muted-foreground/40'
                        }`}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </button>
                    );
                  })}
                </div>
                {preferredPickupDay && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-sm">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Your clean gear returns within 48h of pickup.</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* STEP 4: Plan */}
            {step === 4 && (
              <>
                <div className="pt-4">
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-widest mb-1">Step 4 — Plan</p>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Choose your plan.</h2>
                  <p className="text-muted-foreground text-sm">You can upgrade anytime.</p>
                </div>
                <div className="space-y-3">
                  {/* Core Plan */}
                  {(() => {
                    const core = getPlanConfig('core');
                    return (
                      <button
                        onClick={() => setSubscriptionTier('core')}
                        className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                          subscriptionTier === 'core' ? 'border-green-500 bg-green-500/5' : 'border-border bg-card hover:border-muted-foreground/40'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-foreground text-lg">{core.name}</p>
                            <p className="text-muted-foreground text-sm">{core.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground text-xl">${core.price}</p>
                            <p className="text-muted-foreground text-xs">/month</p>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          {core.features.slice(0, 4).map(f => (
                            <div key={f} className="flex items-center gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })()}

                  {/* Priority Plan */}
                  {(() => {
                    const priority = getPlanConfig('priority');
                    return (
                      <button
                        onClick={() => setSubscriptionTier('priority')}
                        className={`w-full text-left p-5 rounded-xl border-2 transition-all relative overflow-hidden ${
                          subscriptionTier === 'priority' ? 'border-orange-500 bg-orange-500/5' : 'border-orange-500/40 bg-card hover:border-orange-500/60'
                        }`}
                      >
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-orange-500 text-white text-[10px] font-bold">MOST POPULAR</Badge>
                        </div>
                        <div className="flex items-start justify-between mb-3 pr-24">
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="font-bold text-foreground text-lg">{priority.name}</p>
                              <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                            </div>
                            <p className="text-muted-foreground text-sm">{priority.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground text-xl">${priority.price}</p>
                            <p className="text-muted-foreground text-xs">/month</p>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          {priority.features.slice(0, 5).map(f => (
                            <div key={f} className="flex items-center gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })()}
                </div>
              </>
            )}

            {/* STEP 5: Reserve Locker */}
            {step === 5 && (
              <>
                <div className="pt-4">
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-widest mb-1">Step 5 — Your Locker</p>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Reserve your node.</h2>
                  <p className="text-muted-foreground text-sm">This locker at {selectedGym?.name} is yours for every cycle.</p>
                </div>

                {availableLockers.length > 0 ? (
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-2xl p-6 text-center space-y-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
                      <Lock className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <p className="text-foreground font-bold text-xl">Locker #{availableLockers[0]?.locker_number}</p>
                      <p className="text-muted-foreground text-sm mt-1">{selectedGym?.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-card rounded-xl p-3 border border-border">
                        <p className="text-muted-foreground text-xs mb-1">Available Now</p>
                        <p className="font-bold text-green-600">{availableLockers.length} lockers</p>
                      </div>
                      <div className="bg-card rounded-xl p-3 border border-border">
                        <p className="text-muted-foreground text-xs mb-1">Your Plan</p>
                        <p className="font-bold text-foreground capitalize">{subscriptionTier}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-xs">Tap "Reserve My Locker" to lock it in. Your locker code will be revealed after your first drop.</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
                    <p className="font-medium">No lockers available at this gym</p>
                    <button onClick={() => setStep(1)} className="text-green-600 text-sm mt-2 underline">Choose a different gym</button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA Button - sticky bottom */}
      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-4 max-w-lg mx-auto w-full">
        <Button
          onClick={handleNext}
          disabled={!canProceed() || provisionMutation.isPending}
          className="w-full h-14 text-base font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-600/20 gap-2"
        >
          {provisionMutation.isPending ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Setting up your account...</>
          ) : step === 5 ? (
            <><Lock className="w-4 h-4" /> Reserve My Locker</>
          ) : (
            <>Continue <ChevronRight className="w-4 h-4" /></>
          )}
        </Button>
      </div>

      {/* Expansion Request Dialog */}
      <Dialog open={showExpansionRequest} onOpenChange={setShowExpansionRequest}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Request Gym Activation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Gym Name</Label>
              <Input value={expansionGymName} onChange={e => setExpansionGymName(e.target.value)} placeholder="e.g., Equinox River Oaks" />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Address</Label>
              <Input value={expansionGymAddress} onChange={e => setExpansionGymAddress(e.target.value)} placeholder="e.g., 2727 Kirby Dr, Houston, TX" />
            </div>
            <p className="text-muted-foreground text-xs">We evaluate requests based on member density. You'll be first on the list when your gym goes live.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowExpansionRequest(false)} className="flex-1">Cancel</Button>
              <Button
                onClick={() => requestExpansionMutation.mutate()}
                disabled={!expansionGymName || !expansionGymAddress || requestExpansionMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {requestExpansionMutation.isPending ? 'Sending...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}