import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Car,
  FileText,
  ExternalLink,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export default function DriverApplicationReview() {
  const [user, setUser] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.role !== 'admin') {
          toast.error('Admin access required');
          window.location.href = '/';
        }
      } catch (e) {
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['driver-applications'],
    queryFn: () => base44.entities.DriverApplication.list('-created_date'),
    enabled: !!user,
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, status, notes }) => {
      const updateData = {
        status,
        admin_notes: notes,
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString()
      };

      await base44.entities.DriverApplication.update(id, updateData);

      // If approved, update user role to driver
      if (status === 'approved') {
        const app = applications.find(a => a.id === id);
        const users = await base44.asServiceRole.entities.User.filter({ email: app.applicant_email });
        if (users[0]) {
          await base44.asServiceRole.entities.User.update(users[0].id, { role: 'driver' });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-applications'] });
      toast.success('Application updated');
      setSelectedApp(null);
      setAdminNotes('');
    },
  });

  const filteredApplications = applications.filter(app =>
    app.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.applicant_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.license_plate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingApps = filteredApplications.filter(a => a.status === 'submitted' || a.status === 'under_review');
  const approvedApps = filteredApplications.filter(a => a.status === 'approved');
  const rejectedApps = filteredApplications.filter(a => a.status === 'rejected');

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Applications</h1>
        <p className="text-gray-600">Review and approve driver applications</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or license plate..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending ({pendingApps.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Approved ({approvedApps.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Rejected ({rejectedApps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <ApplicationList 
            applications={pendingApps} 
            onSelect={setSelectedApp}
          />
        </TabsContent>

        <TabsContent value="approved">
          <ApplicationList 
            applications={approvedApps} 
            onSelect={setSelectedApp}
          />
        </TabsContent>

        <TabsContent value="rejected">
          <ApplicationList 
            applications={rejectedApps} 
            onSelect={setSelectedApp}
          />
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      {selectedApp && (
        <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Application</DialogTitle>
            </DialogHeader>
            
            <ApplicationDetail 
              application={selectedApp}
              adminNotes={adminNotes}
              setAdminNotes={setAdminNotes}
              onApprove={() => updateApplicationMutation.mutate({
                id: selectedApp.id,
                status: 'approved',
                notes: adminNotes
              })}
              onReject={() => updateApplicationMutation.mutate({
                id: selectedApp.id,
                status: 'rejected',
                notes: adminNotes
              })}
              isLoading={updateApplicationMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ApplicationList({ applications, onSelect }) {
  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">No applications found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => (
        <Card key={app.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(app)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{app.full_name}</h3>
                  <p className="text-sm text-gray-600">{app.applicant_email}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{app.vehicle_make} {app.vehicle_model}</span>
                    <span>•</span>
                    <span>{app.license_plate}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={
                  app.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                  app.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                  app.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }>
                  {app.status}
                </Badge>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ApplicationDetail({ application, adminNotes, setAdminNotes, onApprove, onReject, isLoading }) {
  return (
    <div className="space-y-6">
      {/* Personal Info */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-600">Name:</span> <span className="font-medium">{application.full_name}</span></div>
            <div><span className="text-gray-600">Phone:</span> <span className="font-medium">{application.phone}</span></div>
            <div><span className="text-gray-600">DOB:</span> <span className="font-medium">{application.date_of_birth}</span></div>
            <div><span className="text-gray-600">Email:</span> <span className="font-medium">{application.applicant_email}</span></div>
            <div className="col-span-2"><span className="text-gray-600">Address:</span> <span className="font-medium">{application.address}, {application.city}, {application.state} {application.zip_code}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Info */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Car className="w-5 h-5" />
            Vehicle Details
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-600">Make/Model:</span> <span className="font-medium">{application.vehicle_make} {application.vehicle_model}</span></div>
            <div><span className="text-gray-600">Year:</span> <span className="font-medium">{application.vehicle_year}</span></div>
            <div><span className="text-gray-600">Color:</span> <span className="font-medium">{application.vehicle_color || 'N/A'}</span></div>
            <div><span className="text-gray-600">License Plate:</span> <span className="font-medium">{application.license_plate}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents
          </h3>
          <div className="space-y-2">
            {application.license_document_url && (
              <a href={application.license_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <ExternalLink className="w-4 h-4" />
                View Driver's License
              </a>
            )}
            {application.insurance_document_url && (
              <a href={application.insurance_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <ExternalLink className="w-4 h-4" />
                View Insurance Card
              </a>
            )}
            {application.vehicle_photo_url && (
              <a href={application.vehicle_photo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <ExternalLink className="w-4 h-4" />
                View Vehicle Photo
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Admin Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
        <Textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Add notes about this application..."
          className="h-24"
        />
      </div>

      {/* Actions */}
      {application.status !== 'approved' && application.status !== 'rejected' && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={onReject}
            disabled={isLoading}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={onApprove}
            disabled={isLoading}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approve
          </Button>
        </div>
      )}
    </div>
  );
}