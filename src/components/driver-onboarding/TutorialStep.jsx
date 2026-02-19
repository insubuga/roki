import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Star, 
  Clock,
  DollarSign,
  ChevronLeft,
  Play
} from 'lucide-react';

const tutorialSections = [
  {
    id: 1,
    icon: MapPin,
    title: 'Accepting Deliveries',
    description: 'See available deliveries on your dashboard. Rush orders are highlighted in red and pay more.',
    tips: [
      'Check delivery distance and earnings before accepting',
      'Rush deliveries must be completed within 30 minutes',
      'You can view customer contact info after accepting'
    ]
  },
  {
    id: 2,
    icon: Navigation,
    title: 'Navigation & Routes',
    description: 'Use the route optimizer to plan efficient multi-stop routes and maximize earnings.',
    tips: [
      'Tap "Navigate" to open directions in your preferred map app',
      'Route optimizer prioritizes rush orders and proximity',
      'Update delivery status at each stop for tracking'
    ]
  },
  {
    id: 3,
    icon: Star,
    title: 'Ratings & Performance',
    description: 'Your performance rating affects your eligibility for premium orders.',
    tips: [
      'Maintain 4.5+ rating for Elite driver status',
      'On-time deliveries boost your acceptance rate',
      'Professional service leads to better tips'
    ]
  },
  {
    id: 4,
    icon: DollarSign,
    title: 'Earnings & Payments',
    description: 'Earn 15% commission on shop orders and $15 flat rate on laundry pickups.',
    tips: [
      'Rush deliveries typically earn 50% more',
      'Weekly payouts every Friday',
      'Track daily earnings in your dashboard'
    ]
  }
];

export default function TutorialStep({ data, onNext, onBack, isLoading }) {
  const [completedSections, setCompletedSections] = useState(new Set(data.tutorial_completed ? [1, 2, 3, 4] : []));

  const handleSectionComplete = (sectionId) => {
    setCompletedSections(new Set([...completedSections, sectionId]));
  };

  const handleSubmit = () => {
    onNext({ tutorial_completed: true });
  };

  const allComplete = completedSections.size === tutorialSections.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
          <Play className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Driver Tutorial</h2>
          <p className="text-gray-600 text-sm">Learn how to use the driver app</p>
        </div>
      </div>

      <div className="space-y-4">
        {tutorialSections.map((section) => {
          const Icon = section.icon;
          const isComplete = completedSections.has(section.id);

          return (
            <Card key={section.id} className={`border-2 ${isComplete ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isComplete ? 'bg-green-600' : 'bg-gray-100'
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <Icon className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{section.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{section.description}</p>
                    <ul className="space-y-1 mb-3">
                      {section.tips.map((tip, idx) => (
                        <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                    {!isComplete && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSectionComplete(section.id)}
                      >
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {allComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-900">Tutorial Complete!</span>
          </div>
          <p className="text-sm text-green-800">
            You're ready to start delivering. Proceed to review your application.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1 bg-green-600 hover:bg-green-700"
          disabled={!allComplete || isLoading}
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}