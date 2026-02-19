import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import PersonalInfoStep from '@/components/driver-onboarding/PersonalInfoStep';
import VehicleDetailsStep from '@/components/driver-onboarding/VehicleDetailsStep';
import DocumentUploadStep from '@/components/driver-onboarding/DocumentUploadStep';
import TutorialStep from '@/components/driver-onboarding/TutorialStep';
import ReviewStep from '@/components/driver-onboarding/ReviewStep';

const steps = [
  { number: 1, title: 'Personal Info', description: 'Basic information' },
  { number: 2, title: 'Vehicle Details', description: 'Your vehicle info' },
  { number: 3, title: 'Documents', description: 'License & insurance' },
  { number: 4, title: 'Tutorial', description: 'Learn the app' },
  { number: 5, title: 'Review', description: 'Submit application' },
];

export default function DriverOnboarding() {
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        toast.error('Please sign in to continue');
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: application, isLoading } = useQuery({
    queryKey: ['driver-application', user?.email],
    queryFn: async () => {
      const apps = await base44.entities.DriverApplication.filter({ 
        applicant_email: user.email 
      });
      return apps[0] || null;
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (application) {
      setFormData(application);
      setCurrentStep(application.current_step || 1);
      
      if (application.status === 'submitted' || application.status === 'under_review') {
        toast.info('Your application is under review');
      } else if (application.status === 'approved') {
        toast.success('Your application has been approved!');
      } else if (application.status === 'rejected') {
        toast.error('Your application was rejected. Please contact support.');
      }
    }
  }, [application]);

  const saveApplicationMutation = useMutation({
    mutationFn: async (data) => {
      if (application?.id) {
        return await base44.entities.DriverApplication.update(application.id, data);
      } else {
        return await base44.entities.DriverApplication.create({
          ...data,
          applicant_email: user.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-application'] });
    },
  });

  const handleNext = async (stepData) => {
    const updatedData = { ...formData, ...stepData, current_step: currentStep + 1 };
    setFormData(updatedData);
    
    await saveApplicationMutation.mutateAsync(updatedData);
    setCurrentStep(currentStep + 1);
    toast.success('Progress saved');
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    await saveApplicationMutation.mutateAsync({
      ...formData,
      status: 'submitted',
      current_step: 5
    });
    toast.success('Application submitted! We\'ll review it shortly.');
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (application?.status === 'approved') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome, Driver!</h1>
        <p className="text-gray-600 mb-8">Your application has been approved. You can now start accepting deliveries.</p>
        <Button 
          size="lg"
          className="bg-green-600 hover:bg-green-700"
          onClick={() => window.location.href = '/DriverDashboard'}
        >
          Go to Driver Dashboard
        </Button>
      </div>
    );
  }

  if (application?.status === 'submitted' || application?.status === 'under_review') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Circle className="w-12 h-12 text-blue-600 animate-pulse" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Under Review</h1>
        <p className="text-gray-600 mb-4">We're reviewing your application. This usually takes 24-48 hours.</p>
        <p className="text-sm text-gray-500">We'll notify you via email once your application is processed.</p>
      </div>
    );
  }

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a ROKI Driver</h1>
          <p className="text-gray-600">Complete the steps below to start earning</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progress} className="h-2 mb-4" />
          <div className="flex justify-between">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex flex-col items-center ${
                  currentStep >= step.number ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    currentStep > step.number
                      ? 'bg-green-600 text-white'
                      : currentStep === step.number
                      ? 'bg-green-100 text-green-600 border-2 border-green-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {currentStep > step.number ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{step.number}</span>
                  )}
                </div>
                <p className="text-xs font-medium hidden sm:block">{step.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentStep === 1 && (
                  <PersonalInfoStep
                    data={formData}
                    onNext={handleNext}
                    isLoading={saveApplicationMutation.isPending}
                  />
                )}
                {currentStep === 2 && (
                  <VehicleDetailsStep
                    data={formData}
                    onNext={handleNext}
                    onBack={handleBack}
                    isLoading={saveApplicationMutation.isPending}
                  />
                )}
                {currentStep === 3 && (
                  <DocumentUploadStep
                    data={formData}
                    onNext={handleNext}
                    onBack={handleBack}
                    isLoading={saveApplicationMutation.isPending}
                  />
                )}
                {currentStep === 4 && (
                  <TutorialStep
                    data={formData}
                    onNext={handleNext}
                    onBack={handleBack}
                    isLoading={saveApplicationMutation.isPending}
                  />
                )}
                {currentStep === 5 && (
                  <ReviewStep
                    data={formData}
                    onBack={handleBack}
                    onSubmit={handleSubmit}
                    isLoading={saveApplicationMutation.isPending}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}