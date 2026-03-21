/**
 * DeleteAccountSheet — Mobile-native account deletion confirmation.
 * Uses BottomSheet on mobile, AlertDialog on desktop.
 * Shows clear data-loss explanation with typed confirmation.
 */
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Trash2, User, Package, CreditCard, Lock, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BottomSheet from '@/components/mobile/BottomSheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';

const DATA_ITEMS = [
  { icon: User,       label: 'Profile & identity' },
  { icon: Lock,       label: 'Locker assignments & access codes' },
  { icon: Package,    label: 'All laundry cycles & order history' },
  { icon: CreditCard, label: 'Subscription & billing records' },
  { icon: Clock,      label: 'Reliability score & performance logs' },
];

export default function DeleteAccountSheet({ trigger }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const isMobile = useIsMobile();

  const deleteAccountMutation = useMutation({
    mutationFn: () => base44.functions.invoke('deleteUserAccount', {}),
    onSuccess: () => {
      toast.success('Account permanently deleted');
      setTimeout(() => base44.auth.logout(), 1500);
    },
    onError: () => toast.error('Failed to delete account — contact support'),
  });

  const handleClose = (isOpen) => {
    if (!isOpen) setConfirmText('');
    setOpen(isOpen);
  };

  const canDelete = confirmText === 'DELETE' && !deleteAccountMutation.isPending;

  const content = (
    <div className="space-y-4">
      {/* Warning header */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-foreground font-mono font-bold text-sm">This cannot be undone</p>
          <p className="text-muted-foreground font-mono text-xs mt-0.5">
            Your account and all associated data will be permanently erased within seconds.
          </p>
        </div>
      </div>

      {/* What gets deleted */}
      <div>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mb-2">Data to be deleted</p>
        <div className="space-y-2">
          {DATA_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-red-500" />
              </div>
              <span className="text-foreground font-mono text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Typed confirmation */}
      <div className="space-y-2">
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
          Type <span className="text-red-500 font-bold">DELETE</span> to confirm
        </p>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          autoCapitalize="characters"
          className="bg-muted border-border text-foreground font-mono text-sm min-h-[48px]"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button
          variant="outline"
          className="flex-1 border-border font-mono min-h-[48px]"
          onClick={() => handleClose(false)}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-mono min-h-[48px] disabled:opacity-50"
          disabled={!canDelete}
          onClick={() => deleteAccountMutation.mutate()}
        >
          {deleteAccountMutation.isPending
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
            : <><Trash2 className="w-4 h-4 mr-2" />Delete Forever</>
          }
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>

      {isMobile ? (
        <BottomSheet
          open={open}
          onOpenChange={handleClose}
          title="Delete Account"
        >
          {content}
        </BottomSheet>
      ) : (
        <AlertDialog open={open} onOpenChange={handleClose}>
          <AlertDialogContent className="bg-card border-border max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-red-950/30 border border-red-700 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <AlertDialogTitle className="text-foreground font-mono">Delete Account</AlertDialogTitle>
              </div>
              <AlertDialogDescription asChild>
                <div>{content}</div>
              </AlertDialogDescription>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}