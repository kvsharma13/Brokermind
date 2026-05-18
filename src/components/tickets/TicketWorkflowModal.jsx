import React, { useState } from 'react';
import { brokermind } from '@/api/brokermindClient';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Circle, Clock, AlertTriangle, CheckCheck } from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

// Resolution steps per category
const STEPS_BY_CATEGORY = {
  'Fund Transfer': [
    'Verify client identity & account details',
    'Confirm transfer amount and destination',
    'Check compliance / AML flags',
    'Initiate transfer in back-office system',
    'Send confirmation to client',
  ],
  'Account Opening': [
    'Collect KYC documents',
    'Run KYC / AML checks',
    'Create account in system',
    'Activate trading access',
    'Notify client with credentials',
  ],
  'Platform Support': [
    'Reproduce the reported issue',
    'Identify root cause',
    'Apply fix or workaround',
    'Test resolution',
    'Notify client',
  ],
  'Compliance': [
    'Log the compliance event',
    'Escalate to compliance officer',
    'Gather supporting documents',
    'Submit regulatory report if needed',
    'Close with compliance sign-off',
  ],
  'General Enquiry': [
    'Understand the client query',
    'Retrieve relevant information',
    'Respond to client',
    'Confirm client satisfaction',
  ],
  'DEFAULT': [
    'Acknowledge the ticket',
    'Investigate the issue',
    'Propose resolution',
    'Implement resolution',
    'Confirm with client and close',
  ],
};

const SLA_OPTIONS = [
  { label: '1 hour', minutes: 60 },
  { label: '4 hours', minutes: 240 },
  { label: '8 hours', minutes: 480 },
  { label: '24 hours', minutes: 1440 },
  { label: '48 hours', minutes: 2880 },
  { label: 'Custom', minutes: null },
];

function getSteps(ticket) {
  const cat = ticket?.category || '';
  return (
    STEPS_BY_CATEGORY[cat] ||
    STEPS_BY_CATEGORY['DEFAULT']
  );
}

function parseMeta(ticket) {
  try {
    return ticket.resolution_notes ? JSON.parse(ticket.resolution_notes) : null;
  } catch {
    return null;
  }
}

export default function TicketWorkflowModal({ ticket, open, onClose }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const steps = getSteps(ticket);
  const meta = parseMeta(ticket);

  const [completedSteps, setCompletedSteps] = useState(
    meta?.completed_steps || []
  );
  const [slaSetting, setSlaSetting] = useState(meta?.sla_minutes?.toString() || '');
  const [customSla, setCustomSla] = useState('');
  const [slaBreached, setSlaBreached] = useState(meta?.sla_breached ?? null);
  const [saving, setSaving] = useState(false);

  const slaMinutes = slaSetting === 'custom'
    ? parseInt(customSla) || 0
    : parseInt(slaSetting) || 0;

  const createdAt = ticket?.created_at ? new Date(ticket.created_at) : null;
  const elapsedMinutes = createdAt ? differenceInMinutes(new Date(), createdAt) : 0;
  const slaStatus = slaMinutes > 0
    ? elapsedMinutes > slaMinutes ? 'BREACHED' : 'OK'
    : null;

  const allDone = completedSteps.length === steps.length;
  const progress = Math.round((completedSteps.length / steps.length) * 100);

  const toggleStep = (idx) => {
    setCompletedSteps(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleSave = async (resolveNow = false) => {
    setSaving(true);
    const now = new Date().toISOString();
    const notesPayload = JSON.stringify({
      completed_steps: completedSteps,
      sla_minutes: slaMinutes,
      sla_breached: slaBreached,
      last_updated: now,
    });

    const update = {
      resolution_notes: notesPayload,
      updated_at: now,
    };

    if (resolveNow) {
      update.status = 'RESOLVED';
      update.resolved_at = now;
    }

    await brokermind.entities.Ticket.update(ticket.id, update);
    qc.invalidateQueries({ queryKey: ['tickets'] });
    toast({ title: resolveNow ? 'Ticket Resolved' : 'Progress Saved' });
    setSaving(false);
    if (resolveNow) onClose();
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="font-mono text-primary">{ticket.ticket_id}</span>
            <span className="text-muted-foreground font-normal">— Resolution Workflow</span>
          </DialogTitle>
        </DialogHeader>

        {/* Ticket Meta */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-b pb-3">
          <span><strong>Category:</strong> {ticket.category || '—'}</span>
          <span><strong>Priority:</strong> {ticket.priority}</span>
          <span><strong>Status:</strong> {ticket.status?.replace('_', ' ')}</span>
          {createdAt && <span><strong>Opened:</strong> {format(createdAt, 'MMM d, HH:mm')} ({formatDistanceToNow(createdAt, { addSuffix: true })})</span>}
        </div>

        {/* SLA Section */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">SLA Target</Label>
          <div className="flex flex-wrap gap-2">
            {SLA_OPTIONS.map(opt => (
              <button
                key={opt.label}
                onClick={() => setSlaSetting(opt.minutes ? opt.minutes.toString() : 'custom')}
                className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                  slaSetting === (opt.minutes ? opt.minutes.toString() : 'custom')
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-muted border-border'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {slaSetting === 'custom' && (
            <Input
              type="number"
              placeholder="Minutes"
              value={customSla}
              onChange={e => setCustomSla(e.target.value)}
              className="w-40 text-sm"
            />
          )}
          {slaMinutes > 0 && createdAt && (
            <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 mt-1 ${
              slaStatus === 'BREACHED' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {slaStatus === 'BREACHED'
                ? <AlertTriangle className="w-4 h-4" />
                : <Clock className="w-4 h-4" />}
              {slaStatus === 'BREACHED'
                ? `SLA breached — elapsed ${elapsedMinutes}min vs target ${slaMinutes}min`
                : `On track — ${slaMinutes - elapsedMinutes}min remaining of ${slaMinutes}min SLA`}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Resolution Progress</span>
            <span>{completedSteps.length}/{steps.length} steps</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Resolution Steps</Label>
          <div className="space-y-2">
            {steps.map((step, idx) => {
              const done = completedSteps.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => toggleStep(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                    done
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-card border-border hover:bg-muted/50 text-foreground'
                  }`}
                >
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />}
                  <span className="text-sm">
                    <span className="text-muted-foreground mr-2">Step {idx + 1}.</span>
                    <span className={done ? 'line-through opacity-70' : ''}>{step}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SLA Breach Confirmation (shown when resolving) */}
        {allDone && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <Label className="text-sm font-semibold">Before Confirming Resolution</Label>
            <p className="text-xs text-muted-foreground">Was the SLA breached for this ticket?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setSlaBreached(false)}
                className={`flex items-center gap-2 px-4 py-2 text-xs rounded-lg border transition-all ${
                  slaBreached === false
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-card border-border hover:bg-muted'
                }`}
              >
                <CheckCheck className="w-4 h-4" /> SLA Met
              </button>
              <button
                onClick={() => setSlaBreached(true)}
                className={`flex items-center gap-2 px-4 py-2 text-xs rounded-lg border transition-all ${
                  slaBreached === true
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-card border-border hover:bg-muted'
                }`}
              >
                <AlertTriangle className="w-4 h-4" /> SLA Breached
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            Save Progress
          </Button>
          {allDone && slaBreached !== null && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              Confirm Resolution
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}