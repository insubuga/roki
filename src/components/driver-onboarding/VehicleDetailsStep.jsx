import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Car, ChevronLeft } from 'lucide-react';

export default function VehicleDetailsStep({ data, onNext, onBack, isLoading }) {
  const [formData, setFormData] = useState({
    vehicle_make: data.vehicle_make || '',
    vehicle_model: data.vehicle_model || '',
    vehicle_year: data.vehicle_year || '',
    vehicle_color: data.vehicle_color || '',
    license_plate: data.license_plate || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(formData);
  };

  const isValid = formData.vehicle_make && formData.vehicle_model && 
                  formData.vehicle_year && formData.license_plate;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <Car className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vehicle Details</h2>
          <p className="text-gray-600 text-sm">Information about your vehicle</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div>
          <Label htmlFor="vehicle_make">Make *</Label>
          <Input
            id="vehicle_make"
            value={formData.vehicle_make}
            onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
            placeholder="Toyota"
            required
          />
        </div>

        <div>
          <Label htmlFor="vehicle_model">Model *</Label>
          <Input
            id="vehicle_model"
            value={formData.vehicle_model}
            onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
            placeholder="Camry"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vehicle_year">Year *</Label>
            <Input
              id="vehicle_year"
              value={formData.vehicle_year}
              onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
              placeholder="2020"
              maxLength={4}
              required
            />
          </div>
          <div>
            <Label htmlFor="vehicle_color">Color</Label>
            <Input
              id="vehicle_color"
              value={formData.vehicle_color}
              onChange={(e) => setFormData({ ...formData, vehicle_color: e.target.value })}
              placeholder="Blue"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="license_plate">License Plate *</Label>
          <Input
            id="license_plate"
            value={formData.license_plate}
            onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
            placeholder="ABC1234"
            required
          />
        </div>
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
          disabled={!isValid || isLoading}
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}