import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function ProtectedRoute({ children }) {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then(() => { setAuthed(true); setChecked(true); })
      .catch(() => {
        setChecked(true);
        base44.auth.redirectToLogin(window.location.href);
      });
  }, []);

  if (!checked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return authed ? children : null;
}