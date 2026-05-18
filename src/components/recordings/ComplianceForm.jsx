import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const RISK_TO_SEVERITY = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

function getExtVal(extractions, fieldName) {
  const ext = (extractions || []).find(e => e.type === 'COMPLIANCE_DETAIL' && e.field === fieldName);
  return ext?.value || '';
}

export default function ComplianceForm({ analysis, verifiedBy, onSubmit, onSkip, isLoading }) {
  const extractions = analysis?.extractions || [];
  const [form, setForm] = useState({
    issueSummary: getExtVal(extractions, 'issue_summary') || getExtVal(extractions, 'complaint_type') || analysis?.recommended_action || '',
    severity: RISK_TO_SEVERITY[analysis?.overall_risk] || '',
    affectedAmount: getExtVal(extractions, 'affected_amount'),
    dateOfIncident: getExtVal(extractions, 'date_of_incident'),
    routeTo: '',
    assignedTo: '',
    notes: '',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="mt-4 rounded-xl border bg-card p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escalate Compliance Issue (Optional)</p>

      <div className="space-y-1">
        <Label className="text-xs">Issue Summary</Label>
        <Textarea value={form.issueSummary} onChange={e => set('issueSummary', e.target.value)} placeholder="Describe the issue..." rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {form.affectedAmount && (
          <div className="space-y-1">
            <Label className="text-xs">Affected Amount</Label>
            <Input value={form.affectedAmount} onChange={e => set('affectedAmount', e.target.value)} placeholder="Amount" />
          </div>
        )}
        {form.dateOfIncident && (
          <div className="space-y-1">
            <Label className="text-xs">Date of Incident</Label>
            <Input value={form.dateOfIncident} onChange={e => set('dateOfIncident', e.target.value)} placeholder="Date" />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">Severity</Label>
          <Select value={form.severity} onValueChange={v => set('severity', v)}>
            <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Route To Department</Label>
          <Select value={form.routeTo} onValueChange={v => set('routeTo', v)}>
            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Legal">Legal</SelectItem>
              <SelectItem value="Risk Management">Risk Management</SelectItem>
              <SelectItem value="Fraud Investigation">Fraud Investigation</SelectItem>
              <SelectItem value="Senior Management">Senior Management</SelectItem>
              <SelectItem value="Regulatory Affairs">Regulatory Affairs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Assigned To</Label>
          <Input value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} placeholder="Person name" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..." rows={2} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => onSubmit(form)} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white">
          Escalate
        </Button>
        <Button size="sm" variant="outline" onClick={onSkip} disabled={isLoading}>
          Skip
        </Button>
      </div>
    </div>
  );
}