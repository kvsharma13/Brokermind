import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';

export default function VerificationPanel({ recording, onVerify, onReject, onSendBack, isLoading }) {
  const [action, setAction] = useState(null); // 'verify' | 'reject' | 'sendback'
  const [notes, setNotes] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');

  const handleConfirm = () => {
    if (action === 'verify') onVerify(notes, verifiedBy);
    if (action === 'reject') onReject(notes);
    if (action === 'sendback') onSendBack(notes);
    setAction(null);
    setNotes('');
    setVerifiedBy('');
  };

  if (recording?.verification_status === 'VERIFIED') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-1">
          <CheckCircle2 className="w-5 h-5" /> Verified
        </div>
        <p className="text-sm text-emerald-600">Verified by {recording.verified_by || 'Ops'}</p>
        {recording.notes && <p className="text-xs text-emerald-600 mt-1">Note: {recording.notes}</p>}
      </div>
    );
  }

  if (recording?.verification_status === 'REJECTED') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
          <XCircle className="w-5 h-5" /> Rejected
        </div>
        {recording.notes && <p className="text-xs text-red-600 mt-1">Reason: {recording.notes}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!action ? (
        <div className="flex flex-col gap-2">
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setAction('verify')}
            disabled={isLoading}
          >
            <CheckCircle2 className="w-4 h-4" /> Mark Verified
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setAction('reject')}
            disabled={isLoading}
          >
            <XCircle className="w-4 h-4" /> Reject / Do Not Place
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setAction('sendback')}
            disabled={isLoading}
          >
            <RotateCcw className="w-4 h-4" /> Send Back for Review
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 font-medium text-sm">
            {action === 'verify' && <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Confirm Verification</>}
            {action === 'reject' && <><XCircle className="w-4 h-4 text-red-600" /> Confirm Rejection</>}
            {action === 'sendback' && <><RotateCcw className="w-4 h-4" /> Send Back</>}
          </div>

          {action === 'verify' && (
            <Input
              placeholder="Your name (ops agent)"
              value={verifiedBy}
              onChange={e => setVerifiedBy(e.target.value)}
            />
          )}

          <Textarea
            placeholder={
              action === 'verify' ? 'Add optional verification notes...' :
              action === 'reject' ? 'Reason for rejection (required)...' :
              'Add review notes...'
            }
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />

          {action === 'reject' && !notes.trim() && (
            <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Reason is required</p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setAction(null); setNotes(''); }}>Cancel</Button>
            <Button
              size="sm"
              className={action === 'verify' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : action === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
              onClick={handleConfirm}
              disabled={isLoading || (action === 'reject' && !notes.trim())}
            >
              Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}