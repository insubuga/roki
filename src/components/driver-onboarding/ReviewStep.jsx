import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  User, 
  Car, 
  FileText, 
  ChevronLeft,
  AlertCircle 
} from 'lucide-react';

export default function ReviewStep({ data, onBack, onSubmit, isLoading }) {
  const sections = [
    {
      title: 'Personal Information',
      icon: User,
      items: [
        { label: 'Name', value: data.full_name },
        { label: 'Phone', value: data.phone },
        { label: 'Date of Birth', value: data.date_of_birth },
        { label: 'Address', value: `${data.address}, ${data.city}, ${data.state} ${data.zip_code}` },
      ]
    },
    {
      title: 'Vehicle Details',
      icon: Car,
      items: [
        { label: 'Make & Model', value: `${data.vehicle_make} ${data.vehicle_model}` },
        { label: 'Year', value: data.vehicle_year },
        { label: 'Color', value: data.vehicle_color || 'Not specified' },
        { label: 'License Plate', value: data.license_plate },
      ]
    },
    {
      title: 'Documents',
      icon: FileText,
      items: [
        { label: "Driver's License", value: data.license_document_url ? 'Uploaded' : 'Missing' },
        { label: 'Insurance Card', value: data.insurance_document_url ? 'Uploaded' : 'Missing' },
        { label: 'Vehicle Photo', value: data.vehicle_photo_url ? 'Uploaded' : 'Not provided' },
      ]
    }
  ];

  const allDocsUploaded = data.license_document_url && data.insurance_document_url;
  const tutorialComplete = data.tutorial_completed;
  const canSubmit = allDocsUploaded && tutorialComplete;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Application</h2>
          <p className="text-gray-600 text-sm">Confirm your information before submitting</p>
        </div>
      </div>

      {/* Application Summary */}
      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">{section.title}</h3>
                </div>
                <div className="space-y-2">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm">
                      <span className="text-gray-600">{item.label}:</span>
                      <span className="font-medium text-gray-900 text-right ml-4">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg border ${tutorialComplete ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2">
            {tutorialComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400" />
            )}
            <span className="text-sm font-medium">Tutorial</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg border ${allDocsUploaded ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2">
            {allDocsUploaded ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400" />
            )}
            <span className="text-sm font-medium">Documents</span>
          </div>
        </div>
      </div>

      {/* Submission Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• We'll review your application within 24-48 hours</li>
          <li>• You'll receive an email notification once approved</li>
          <li>• After approval, you can start accepting deliveries</li>
          <li>• Background check may be required in some areas</li>
        </ul>
      </div>

      {!canSubmit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 mb-1">Application Incomplete</h4>
              <p className="text-sm text-red-800">
                Please complete all required steps before submitting.
              </p>
            </div>
          </div>
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
          onClick={onSubmit}
          className="flex-1 bg-green-600 hover:bg-green-700"
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? 'Submitting...' : 'Submit Application'}
        </Button>
      </div>
    </div>
  );
}