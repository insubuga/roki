import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Search,
  ArrowLeft,
  Shield,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';

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
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 -m-6 p-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl shadow-2xl mb-8 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                  <Car className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">Driver Applications</h1>
                  <p className="text-blue-100 mt-1">Review and approve driver candidates</p>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3">
              <p className="text-white/80 text-xs">Total Applications</p>
              <p className="text-white font-bold text-2xl">{applications.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3">
              <p className="text-white/80 text-xs">Pending Review</p>
              <p className="text-white font-bold text-2xl">{pendingApps.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6 shadow-lg border-gray-200">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or license plate..."
              className="pl-12 h-12 text-base border-gray-300 focus:border-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="bg-white border border-gray-200 shadow-sm p-1 grid grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-yellow-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Pending</span> ({pendingApps.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Approved</span> ({approvedApps.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-md">
            <XCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Rejected</span> ({rejectedApps.length})
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
      <Card className="border-gray-200 shadow-lg">
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">No applications found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((app, index) => (
        <motion.div
          key={app.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-gray-200 group overflow-hidden" onClick={() => onSelect(app)}>
            <div className={`h-1 bg-gradient-to-r ${
              app.status === 'submitted' || app.status === 'under_review' ? 'from-yellow-500 to-orange-600' :
              app.status === 'approved' ? 'from-green-500 to-emerald-600' :
              'from-red-500 to-red-600'
            }`}></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-16 h-16 bg-gradient-to-br rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform ${
                    app.status === 'submitted' || app.status === 'under_review' ? 'from-yellow-500 to-orange-600' :
                    app.status === 'approved' ? 'from-green-500 to-emerald-600' :
                    'from-red-500 to-red-600'
                  }`}>
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{app.full_name}</h3>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-3.5 h-3.5" />
                        {app.applicant_email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Car className="w-3.5 h-3.5" />
                        <span>{app.vehicle_make} {app.vehicle_model} ({app.vehicle_year})</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-mono">{app.license_plate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        Applied {new Date(app.created_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <Badge className={`${
                    app.status === 'submitted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    app.status === 'under_review' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    app.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                    'bg-red-100 text-red-800 border-red-200'
                  } border px-3 py-1 text-xs font-semibold uppercase`}>
                    {app.status.replace('_', ' ')}
                  </Badge>
                  <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function ApplicationDetail({ application, adminNotes, setAdminNotes, onApprove, onReject, isLoading }) {
  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <Badge className={`${
          application.status === 'submitted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
          application.status === 'under_review' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
          application.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
          'bg-red-100 text-red-800 border-red-200'
        } border px-4 py-2 text-sm font-semibold uppercase`}>
          {application.status.replace('_', ' ')}
        </Badge>
        {application.reviewed_by && (
          <div className="text-sm text-gray-600">
            Reviewed by <span className="font-medium">{application.reviewed_by}</span>
          </div>
        )}
      </div>

      {/* Personal Info */}
      <Card className="border-gray-200 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent pb-3">
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-500 text-xs mb-1">Full Name</p>
                <p className="font-semibold text-gray-900">{application.full_name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-500 text-xs mb-1">Phone</p>
                <p className="font-semibold text-gray-900">{application.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-500 text-xs mb-1">Date of Birth</p>
                <p className="font-semibold text-gray-900">{application.date_of_birth}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-500 text-xs mb-1">Email</p>
                <p className="font-semibold text-gray-900">{application.applicant_email}</p>
              </div>
            </div>
            <div className="sm:col-span-2 flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-500 text-xs mb-1">Address</p>
                <p className="font-semibold text-gray-900">{application.address}, {application.city}, {application.state} {application.zip_code}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Info */}
      <Card className="border-gray-200 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
        <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent pb-3">
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            Vehicle Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">Make & Model</p>
              <p className="font-semibold text-gray-900">{application.vehicle_make} {application.vehicle_model}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Year</p>
              <p className="font-semibold text-gray-900">{application.vehicle_year}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Color</p>
              <p className="font-semibold text-gray-900">{application.vehicle_color || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">License Plate</p>
              <p className="font-semibold text-gray-900 font-mono bg-gray-100 inline-block px-3 py-1 rounded">{application.license_plate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="border-gray-200 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
        <CardHeader className="bg-gradient-to-r from-green-50 to-transparent pb-3">
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            Uploaded Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid sm:grid-cols-3 gap-3">
            {application.license_document_url && (
              <a href={application.license_document_url} target="_blank" rel="noopener noreferrer" 
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition-all group border border-blue-200">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-blue-900">Driver's License</span>
                <ExternalLink className="w-4 h-4 text-blue-600" />
              </a>
            )}
            {application.insurance_document_url && (
              <a href={application.insurance_document_url} target="_blank" rel="noopener noreferrer" 
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:shadow-md transition-all group border border-purple-200">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-purple-900">Insurance Card</span>
                <ExternalLink className="w-4 h-4 text-purple-600" />
              </a>
            )}
            {application.vehicle_photo_url && (
              <a href={application.vehicle_photo_url} target="_blank" rel="noopener noreferrer" 
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:shadow-md transition-all group border border-green-200">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-green-900">Vehicle Photo</span>
                <ExternalLink className="w-4 h-4 text-green-600" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Previous Admin Notes */}
      {application.admin_notes && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-gray-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Previous Admin Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{application.admin_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Admin Notes */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Add Admin Notes</label>
        <Textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Add notes about this application (required for approval/rejection)..."
          className="h-28 border-gray-300 focus:border-blue-500"
        />
      </div>

      {/* Actions */}
      {application.status !== 'approved' && application.status !== 'rejected' && (
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1 border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 h-12 font-semibold"
            onClick={onReject}
            disabled={isLoading}
          >
            <XCircle className="w-5 h-5 mr-2" />
            Reject Application
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-12 font-semibold shadow-lg"
            onClick={onApprove}
            disabled={isLoading}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Approve & Grant Access
          </Button>
        </div>
      )}

      {(application.status === 'approved' || application.status === 'rejected') && (
        <div className={`p-4 rounded-xl border-2 ${
          application.status === 'approved' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-sm font-medium ${
            application.status === 'approved' ? 'text-green-900' : 'text-red-900'
          }`}>
            {application.status === 'approved' 
              ? '✓ Application approved - User has been granted driver access' 
              : '✗ Application rejected'}
          </p>
          {application.reviewed_date && (
            <p className="text-xs text-gray-600 mt-1">
              Reviewed on {new Date(application.reviewed_date).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}