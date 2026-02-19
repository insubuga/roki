import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { FileText, Upload, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentUploadStep({ data, onNext, onBack, isLoading }) {
  const [uploading, setUploading] = useState({});
  const [documents, setDocuments] = useState({
    license_document_url: data.license_document_url || '',
    insurance_document_url: data.insurance_document_url || '',
    vehicle_photo_url: data.vehicle_photo_url || '',
  });

  const handleFileUpload = async (file, field) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading({ ...uploading, [field]: true });
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDocuments({ ...documents, [field]: file_url });
      toast.success('Document uploaded');
    } catch (error) {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading({ ...uploading, [field]: false });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(documents);
  };

  const isValid = documents.license_document_url && documents.insurance_document_url;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
          <FileText className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Upload Documents</h2>
          <p className="text-gray-600 text-sm">We need to verify your credentials</p>
        </div>
      </div>

      <div className="space-y-4">
        <DocumentUploadField
          label="Driver's License *"
          description="Clear photo of your valid driver's license"
          field="license_document_url"
          value={documents.license_document_url}
          uploading={uploading.license_document_url}
          onUpload={(file) => handleFileUpload(file, 'license_document_url')}
        />

        <DocumentUploadField
          label="Insurance Card *"
          description="Current auto insurance card"
          field="insurance_document_url"
          value={documents.insurance_document_url}
          uploading={uploading.insurance_document_url}
          onUpload={(file) => handleFileUpload(file, 'insurance_document_url')}
        />

        <DocumentUploadField
          label="Vehicle Photo (Optional)"
          description="Photo of your vehicle"
          field="vehicle_photo_url"
          value={documents.vehicle_photo_url}
          uploading={uploading.vehicle_photo_url}
          onUpload={(file) => handleFileUpload(file, 'vehicle_photo_url')}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Important:</strong> Ensure all documents are clear and readable. 
          Blurry or incomplete documents may delay your application.
        </p>
      </div>

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
          type="submit"
          className="flex-1 bg-green-600 hover:bg-green-700"
          disabled={!isValid || isLoading || Object.values(uploading).some(v => v)}
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}

function DocumentUploadField({ label, description, field, value, uploading, onUpload }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <Label className="text-base font-semibold">{label}</Label>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      
      {value ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Document uploaded</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById(field).click()}
          >
            Replace
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => document.getElementById(field).click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </>
          )}
        </Button>
      )}
      
      <input
        id={field}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => onUpload(e.target.files[0])}
      />
    </div>
  );
}