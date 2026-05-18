import React, { useState, useRef } from 'react';
import { brokermind } from '@/api/brokermindClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';
import TranscriptViewer from '@/components/recordings/TranscriptViewer';
import ExtractionCard from '@/components/recordings/ExtractionCard';
import VerificationPanel from '@/components/recordings/VerificationPanel';
import OrderForm from '@/components/recordings/OrderForm';
import InformationalConfirmation from '@/components/recordings/InformationalConfirmation';
import NewAccountForm from '@/components/recordings/NewAccountForm';
import ComplianceForm from '@/components/recordings/ComplianceForm';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { triageCall, parseAnalysis as parseAnalysisUtil } from '@/lib/triageUtils';

const RISK_BADGE = {
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function formatDuration(secs) {
  if (!secs) return '-';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseAnalysis(aiAnalysis) {
  if (!aiAnalysis) return null;
  try { return typeof aiAnalysis === 'string' ? JSON.parse(aiAnalysis) : aiAnalysis; }
  catch { return null; }
}

async function createPerformedAction(recording, triageType, actionType, actionDetails, performedBy) {
  const action = await brokermind.entities.PerformedAction.create({
    recording_id: recording.id,
    session_id: recording.session_id || '',
    client_id: recording.client_id,
    triage_type: triageType,
    action_type: actionType,
    action_details: JSON.stringify(actionDetails),
    performed_by: performedBy,
    performed_at: new Date().toISOString(),
    status: 'COMPLETED',
  });
  // Update matching ticket
  if (action?.id) {
    brokermind.functions.invoke('ticketAutomation', {
      event_type: 'performed_action_created',
      performed_action_id: action.id,
    }).catch(() => {});
  }
}

export default function RecordingDetail({ recordingId, onBack, clientMap }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeQuote, setActiveQuote] = useState(null);
  const [activeCardIdx, setActiveCardIdx] = useState(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [postVerifyTriage, setPostVerifyTriage] = useState(null); // 'Informational' | 'New Account' | 'Compliance'
  const [postVerifyAnalysis, setPostVerifyAnalysis] = useState(null);
  const [postVerifyBy, setPostVerifyBy] = useState('Ops');
  const extractionListRef = useRef(null);
  const audioSeekFnRef = useRef(null); // will hold the seekTo fn from AudioPlayer

  const { data: recording, isLoading } = useQuery({
    queryKey: ['recording', recordingId],
    queryFn: async () => {
      const all = await brokermind.entities.CallRecording.list();
      return all.find(r => r.id === recordingId);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => brokermind.entities.CallRecording.update(recordingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recording', recordingId] });
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      queryClient.invalidateQueries({ queryKey: ['unverified-actionable-count'] });
    },
  });

  function isTransactional(rec, analysis) {
    if (!analysis) return false;
    const summary = (analysis.summary || '').toLowerCase();
    const action = (analysis.recommended_action || '').toLowerCase();
    const combined = summary + ' ' + action;
    const transactionalTypes = ['BUY_ORDER', 'SELL_ORDER', 'PRICE_MENTION', 'QTY_PRICE', 'CONDITIONAL_ORDER', 'PRICE_RANGE'];
    const hasTransactionalExt = (analysis.extractions || []).some(e => transactionalTypes.includes((e.type || '').toUpperCase()));
    return hasTransactionalExt || /\b(buy|sell|order|trade|purchase|execute|margin call|place|qty|quantity|price|lot|shares)\b/.test(combined);
  }

  const handleVerify = async (notes, verifiedBy) => {
    const resolvedBy = verifiedBy || 'Ops';
    updateMutation.mutate({
      verification_status: 'VERIFIED',
      verified_by: resolvedBy,
      verified_at: new Date().toISOString(),
      notes,
    });
    toast({ title: '✅ Verified', description: 'Recording marked as verified.' });

    // Auto-create/update ticket
    brokermind.functions.invoke('ticketAutomation', { event_type: 'recording_verified', recording_id: recordingId })
      .catch(() => {});

    const analysis = parseAnalysis(recording?.ai_analysis);
    const triage = triageCall(recording, analysis);

    setPostVerifyBy(resolvedBy);
    setPostVerifyAnalysis(analysis);

    if (triage === 'Transactional') {
      setShowOrderForm(true);
    } else if (triage === 'Informational') {
      await createPerformedAction(recording, 'Informational', 'QUERY_RESOLVED', {
        summary: analysis?.summary,
        recommended_action: analysis?.recommended_action,
      }, 'AI');
      setPostVerifyTriage('Informational');
    } else if (triage === 'New Account') {
      setPostVerifyTriage('New Account');
    } else if (triage === 'Compliance') {
      setPostVerifyTriage('Compliance');
    }
  };

  const handleReject = (notes) => {
    updateMutation.mutate({ verification_status: 'REJECTED', notes });
    toast({ title: '❌ Rejected', description: 'Recording marked as rejected.', variant: 'destructive' });
    // Update matching ticket to RESOLVED
    brokermind.functions.invoke('ticketAutomation', { event_type: 'recording_verified', recording_id: recordingId })
      .catch(() => {});
  };

  const handleSendBack = (notes) => {
    updateMutation.mutate({ verification_status: 'UNVERIFIED', notes });
    toast({ title: '↩ Sent Back', description: 'Recording sent back for review.' });
  };

  const handleQuoteClick = (quote) => {
    setActiveQuote(quote);
    if (!analysis) return;
    const idx = analysis.extractions?.findIndex(e => e.quote === quote);
    if (idx !== undefined && idx >= 0) {
      setActiveCardIdx(idx);
      // Scroll extraction card into view
      setTimeout(() => {
        const el = extractionListRef.current?.querySelector(`[data-card-idx="${idx}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  };

  const handleJumpToTranscript = (quote) => {
    setActiveQuote(quote);
  };

  const handleSeekTo = (secs) => {
    if (audioSeekFnRef.current) audioSeekFnRef.current(secs);
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3"><Skeleton className="h-96 w-full" /></div>
          <div className="lg:col-span-2"><Skeleton className="h-96 w-full" /></div>
        </div>
      </div>
    );
  }

  if (!recording) {
    return <div className="p-8 text-muted-foreground">Recording not found.</div>;
  }

  const analysis = parseAnalysis(recording.ai_analysis);
  const client = clientMap?.[recording.client_id];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b bg-card flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div>
            <span className="font-semibold text-sm">{client?.name || recording.client_id}</span>
            <span className="text-xs text-muted-foreground ml-2">{client?.phone}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {recording.received_at ? format(new Date(recording.received_at), 'MMM d yyyy, HH:mm') : '-'}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{formatDuration(recording.duration_seconds)}</span>
          {analysis?.overall_risk && (
            <Badge variant="outline" className={`text-xs font-semibold ${RISK_BADGE[analysis.overall_risk]}`}>
              {analysis.overall_risk === 'HIGH' && <AlertTriangle className="w-3 h-3 mr-1" />}
              {analysis.overall_risk} RISK
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-5">
        {/* LEFT: Transcript */}
        <div className="lg:col-span-3 flex flex-col overflow-hidden border-r p-5">
          <h2 className="text-sm font-semibold mb-3 shrink-0">Transcript</h2>
          <div className="flex-1 overflow-hidden">
            <TranscriptViewer
              transcript={recording.transcript}
              extractions={analysis?.extractions || []}
              activeQuote={activeQuote}
              onQuoteClick={handleQuoteClick}
              recording={recording}
              seekRef={audioSeekFnRef}
            />
          </div>
        </div>

        {/* RIGHT: Extractions + Actions — single scrollable column */}
        <div className="lg:col-span-2 overflow-y-auto">
          <div ref={extractionListRef} className="p-5 space-y-3">
            <h2 className="text-sm font-semibold">
              AI Extractions
              {analysis?.extractions?.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">({analysis.extractions.length} found)</span>
              )}
            </h2>

            {(!analysis?.extractions || analysis.extractions.length === 0) ? (
              <p className="text-sm text-muted-foreground py-4">No actionable extractions found.</p>
            ) : (
              analysis.extractions.map((ext, idx) => (
                <div key={idx} data-card-idx={idx}>
                  <ExtractionCard
                    extraction={ext}
                    index={idx}
                    isActive={activeCardIdx === idx}
                    onClick={() => { setActiveCardIdx(idx); setActiveQuote(ext.quote); }}
                    onJumpToTranscript={handleJumpToTranscript}
                    onSeekTo={handleSeekTo}
                  />
                </div>
              ))
            )}

            {/* Recommended Action */}
            {analysis?.recommended_action && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-800 mb-1">Recommended Action</p>
                  <p className="text-sm text-blue-700">{analysis.recommended_action}</p>
                </div>
              </div>
            )}

            {/* Verification actions */}
            <div className="border-t pt-5 space-y-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Verification</p>
              <VerificationPanel
                recording={recording}
                onVerify={handleVerify}
                onReject={handleReject}
                onSendBack={handleSendBack}
                isLoading={updateMutation.isPending}
              />

              {/* Transactional: Order Form */}
              {showOrderForm && (
                <OrderForm
                  extractions={analysis?.extractions || []}
                  onDismiss={() => setShowOrderForm(false)}
                  onPlaceOrder={async ({ symbol, qty, price, orderType }) => {
                    await createPerformedAction(recording, 'Transactional', 'ORDER_PLACED', {
                      symbol, qty, price, orderType,
                    }, postVerifyBy);
                    toast({ title: '✅ Order submitted successfully' });
                    setShowOrderForm(false);
                  }}
                />
              )}

              {/* Informational: auto-resolved confirmation */}
              {postVerifyTriage === 'Informational' && (
                <InformationalConfirmation summary={postVerifyAnalysis?.summary} />
              )}

              {/* New Account: inline form */}
              {postVerifyTriage === 'New Account' && (
                <NewAccountForm
                  client={client}
                  analysis={postVerifyAnalysis}
                  verifiedBy={postVerifyBy}
                  isLoading={updateMutation.isPending}
                  onSubmit={async (formData) => {
                    const { performedBy, ...details } = formData;
                    await createPerformedAction(recording, 'New Account', 'ACCOUNT_REQUEST_SUBMITTED', details, performedBy || postVerifyBy);
                    toast({ title: '✅ Account request submitted' });
                    setPostVerifyTriage(null);
                  }}
                  onSkip={async () => {
                    await createPerformedAction(recording, 'New Account', 'ACCOUNT_FLAGGED', {
                      summary: postVerifyAnalysis?.summary,
                    }, postVerifyBy);
                    toast({ title: 'Skipped — action logged' });
                    setPostVerifyTriage(null);
                  }}
                />
              )}

              {/* Compliance: inline escalation form */}
              {postVerifyTriage === 'Compliance' && (
                <ComplianceForm
                  analysis={postVerifyAnalysis}
                  verifiedBy={postVerifyBy}
                  isLoading={updateMutation.isPending}
                  onSubmit={async (formData) => {
                    await createPerformedAction(recording, 'Compliance', 'COMPLIANCE_ESCALATED', formData, postVerifyBy);
                    toast({ title: '✅ Compliance issue escalated' });
                    setPostVerifyTriage(null);
                  }}
                  onSkip={async () => {
                    await createPerformedAction(recording, 'Compliance', 'COMPLIANCE_NOTED', {
                      summary: postVerifyAnalysis?.summary,
                    }, postVerifyBy);
                    toast({ title: 'Skipped — compliance noted' });
                    setPostVerifyTriage(null);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}