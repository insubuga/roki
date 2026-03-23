import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2, XCircle, Clock, User, Car, FileText,
  ExternalLink, Search, ArrowLeft, Shield, MapPin,
  Phone, Mail, Calendar, Image as ImageIcon, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG = {
  submitted:    { label: 'Submitted',    color: 'text-blue-400',   bg: 'bg-blue-500/10',  border: 'border-blue-500/20' },
  under_review: { label: 'Under Review', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  approved:     { label: 'Approved',     color: 'text-green-400',  bg: 'bg-green-500/10', border: 'border-green-500/20' },
  rejected:     { label: 'Rejected',     color: 'text-red-400',    bg: 'bg-red-500/10',   border: 'border-red-500/20' },
};

export default function DriverApplicationReview() {
  const [user, setUser] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u.role !== 'admin') { toast.error('Admin access required'); window.location.href = '/'; return; }
      setUser(u);
    }).catch(() => { window.location.href = '/'; });
  }, []);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['driver-applications'],
    queryFn: () => base44.entities.DriverApplication.list('-created_date'),
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }) => {
      await base44.entities.DriverApplication.update(id, {
        status,
        admin_notes: notes,
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString(),
      });
      const app = applications.find(a => a.id === id);
      if (status === 'approved') {
        const users = await base44.asServiceRole.entities.User.filter({ email: app.applicant_email });
        if (users[0]) await base44.asServiceRole.entities.User.update(users[0].id, { role: 'driver' });
      }
      await base44.asServiceRole.entities.Notification.create({
        user_email: app.applicant_email,
        type: 'system',
        title: status === 'approved' ? '🎉 Driver Application Approved!' : 'Driver Application Update',
        message: status === 'approved'
          ? 'Your driver application has been approved. You now have access to the Driver Dashboard.'
          : `Your application was reviewed. ${notes ? `Note: ${notes}` : 'Contact support for details.'}`,
        priority: 'high',
        read: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-applications'] });
      toast.success('Application updated');
      setSelectedApp(null);
      setAdminNotes('');
    },
  });

  const filtered = applications.filter(app =>
    app.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.applicant_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.license_plate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { key: 'pending',  label: 'Pending',  apps: filtered.filter(a => a.status === 'submitted' || a.status === 'under_review') },
    { key: 'approved', label: 'Approved', apps: filtered.filter(a => a.status === 'approved') },
    { key: 'rejected', label: 'Rejected', apps: filtered.filter(a => a.status === 'rejected') },
  ];

  const activeApps = tabs.find(t => t.key === activeTab)?.apps || [];
  const pendingCount = applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length;

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Link to={createPageUrl('AdminDashboard')}>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Driver Applications</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            {applications.length} total · {pendingCount} pending review
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-mono text-xs">
            {pendingCount} to review
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by name, email, or license plate…"
          className="pl-9 bg-card border-border"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-green-500 text-green-500'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.key === 'pending' && <Clock className="w-3.5 h-3.5" />}
            {tab.key === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {tab.key === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
              activeTab === tab.key ? 'bg-green-500/10 text-green-400' : 'bg-muted text-muted-foreground'
            }`}>
              {tab.apps.length}
            </span>
          </button>
        ))}
      </div>

      {/* Application List */}
      <div className="space-y-2">
        <AnimatePresence mode="wait">
          {activeApps.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-16 text-center text-muted-foreground"
            >
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500/30" />
              <p className="text-sm font-medium">
                {activeTab === 'pending' ? 'All caught up — no pending applications' : `No ${activeTab} applications`}
              </p>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {activeApps.map((app, i) => {
                const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted;
                return (
                  <motion.button
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => { setSelectedApp(app); setAdminNotes(''); }}
                    className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-green-500/30 hover:bg-card/80 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-foreground text-sm">{app.full_name}</span>
                          <Badge className={`${cfg.bg} ${cfg.color} ${cfg.border} border text-[10px] font-mono px-1.5 py-0`}>
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs truncate">{app.applicant_email}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {app.vehicle_make} {app.vehicle_model} {app.vehicle_year && `(${app.vehicle_year})`}
                          {app.license_plate && <span className="font-mono ml-2 text-foreground/50">· {app.license_plate}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-muted-foreground text-xs hidden sm:block">
                          {new Date(app.created_date).toLocaleDateString()}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-green-500 transition-colors" />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Review Dialog */}
      {selectedApp && (
        <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span>{selectedApp.full_name}</span>
                <Badge className={`${STATUS_CONFIG[selectedApp.status]?.bg} ${STATUS_CONFIG[selectedApp.status]?.color} ${STATUS_CONFIG[selectedApp.status]?.border} border text-xs font-mono`}>
                  {STATUS_CONFIG[selectedApp.status]?.label}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <ApplicationDetail
              application={selectedApp}
              adminNotes={adminNotes}
              setAdminNotes={setAdminNotes}
              onApprove={() => updateMutation.mutate({ id: selectedApp.id, status: 'approved', notes: adminNotes })}
              onReject={() => updateMutation.mutate({ id: selectedApp.id, status: 'rejected', notes: adminNotes })}
              isLoading={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className="text-foreground text-sm font-medium">{value}</p>
    </div>
  );
}

function ApplicationDetail({ application, adminNotes, setAdminNotes, onApprove, onReject, isLoading }) {
  const isPending = application.status === 'submitted' || application.status === 'under_review';

  return (
    <div className="space-y-6 pt-2">
      {/* Personal */}
      <Section title="Personal Information" icon={User}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Full Name" value={application.full_name} />
          <Field label="Email" value={application.applicant_email} />
          <Field label="Phone" value={application.phone} />
          <Field label="Date of Birth" value={application.date_of_birth} />
          <div className="col-span-2">
            <Field label="Address" value={[application.address, application.city, application.state, application.zip_code].filter(Boolean).join(', ')} />
          </div>
        </div>
      </Section>

      <div className="border-t border-border" />

      {/* Vehicle */}
      <Section title="Vehicle Details" icon={Car}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Make & Model" value={`${application.vehicle_make || ''} ${application.vehicle_model || ''}`.trim()} />
          <Field label="Year" value={application.vehicle_year} />
          <Field label="Color" value={application.vehicle_color} />
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">License Plate</p>
            {application.license_plate && (
              <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded text-foreground">{application.license_plate}</span>
            )}
          </div>
        </div>
      </Section>

      <div className="border-t border-border" />

      {/* Documents */}
      <Section title="Uploaded Documents" icon={FileText}>
        <div className="flex gap-2 flex-wrap">
          {application.license_document_url && (
            <a href={application.license_document_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm text-foreground transition-colors border border-border">
              <FileText className="w-4 h-4 text-blue-400" />
              Driver's License
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
          )}
          {application.insurance_document_url && (
            <a href={application.insurance_document_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm text-foreground transition-colors border border-border">
              <Shield className="w-4 h-4 text-purple-400" />
              Insurance Card
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
          )}
          {application.vehicle_photo_url && (
            <a href={application.vehicle_photo_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm text-foreground transition-colors border border-border">
              <ImageIcon className="w-4 h-4 text-green-400" />
              Vehicle Photo
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
          )}
          {!application.license_document_url && !application.insurance_document_url && !application.vehicle_photo_url && (
            <p className="text-muted-foreground text-sm">No documents uploaded</p>
          )}
        </div>
      </Section>

      {/* Existing notes */}
      {application.admin_notes && (
        <>
          <div className="border-t border-border" />
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-yellow-400 text-xs font-semibold mb-1 uppercase tracking-wider">Previous Admin Note</p>
            <p className="text-foreground text-sm">{application.admin_notes}</p>
          </div>
        </>
      )}

      <div className="border-t border-border" />

      {/* Resolved state */}
      {!isPending && (
        <div className={`rounded-lg p-3 border text-sm ${
          application.status === 'approved'
            ? 'bg-green-500/5 border-green-500/20 text-green-400'
            : 'bg-red-500/5 border-red-500/20 text-red-400'
        }`}>
          {application.status === 'approved' ? '✓ Approved — driver access granted' : '✗ Application rejected'}
          {application.reviewed_date && (
            <span className="text-muted-foreground text-xs ml-2">
              · {new Date(application.reviewed_date).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Admin notes + actions */}
      {isPending && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Admin Notes</label>
            <Textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Add notes before approving or rejecting…"
              className="h-24 bg-muted border-border text-sm resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 h-10"
              onClick={onReject}
              disabled={isLoading}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Reject
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-500 text-white h-10"
              onClick={onApprove}
              disabled={isLoading}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Approve & Grant Access
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}