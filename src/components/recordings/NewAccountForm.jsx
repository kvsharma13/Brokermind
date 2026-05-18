import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

function getExtractionValue(extractions, fieldName) {
  const ext = (extractions || []).find(e => e.type === 'NEW_ACCOUNT_DETAIL' && e.field === fieldName);
  return ext?.value || '';
}

export default function NewAccountForm({ client, analysis, verifiedBy, onSubmit, onSkip, isLoading }) {
  const [tab, setTab] = useState('manual');
  const extractions = analysis?.extractions || [];

  const aiName = getExtractionValue(extractions, 'customer_name') || client?.name || '';
  const aiPhone = getExtractionValue(extractions, 'customer_phone') || client?.phone || '';
  const aiAccountType = getExtractionValue(extractions, 'account_type') || '';
  const aiKycStatus = getExtractionValue(extractions, 'kyc_status') || 'Pending';
  const aiPan = getExtractionValue(extractions, 'document_mentioned') || '';

  const [manualForm, setManualForm] = useState({
    applicantName: aiName,
    contactNumber: aiPhone,
    panNumber: aiPan,
    accountType: aiAccountType,
    kycStatus: aiKycStatus,
    notes: '',
  });

  const aiForm = {
    applicantName: aiName,
    contactNumber: aiPhone,
    panNumber: aiPan,
    accountType: aiAccountType,
    kycStatus: aiKycStatus,
    notes: analysis?.recommended_action || '',
  };

  const setManual = (key, val) => setManualForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="mt-4 rounded-xl border bg-card p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Account Details (Optional)</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('manual')}
          className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${tab === 'manual' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Manual
        </button>
        <button
          onClick={() => setTab('ai')}
          className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${tab === 'ai' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          AI Recommended
        </button>
      </div>

      {tab === 'manual' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Applicant Name</Label>
              <Input value={manualForm.applicantName} onChange={e => setManual('applicantName', e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact Number</Label>
              <Input value={manualForm.contactNumber} onChange={e => setManual('contactNumber', e.target.value)} placeholder="Phone" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">PAN Number</Label>
              <Input value={manualForm.panNumber} onChange={e => setManual('panNumber', e.target.value)} placeholder="XXXXXXXXXX" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Account Type</Label>
              <Select value={manualForm.accountType} onValueChange={v => setManual('accountType', v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Demat">Demat</SelectItem>
                  <SelectItem value="Trading">Trading</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">KYC Status</Label>
              <Select value={manualForm.kycStatus} onValueChange={v => setManual('kycStatus', v)}>
                <SelectTrigger><SelectValue placeholder="KYC status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={manualForm.notes} onChange={e => setManual('notes', e.target.value)} placeholder="Additional remarks..." rows={2} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => onSubmit({ ...manualForm, performedBy: verifiedBy })} disabled={isLoading} className="bg-primary text-primary-foreground">
              Submit Account Request
            </Button>
            <Button size="sm" variant="outline" onClick={onSkip} disabled={isLoading}>Skip</Button>
          </div>
        </>
      )}

      {tab === 'ai' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Applicant Name</Label>
              <Input value={aiForm.applicantName} readOnly className="bg-muted/50 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact Number</Label>
              <Input value={aiForm.contactNumber} readOnly className="bg-muted/50 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">PAN Number</Label>
              <Input value={aiForm.panNumber} readOnly placeholder="—" className="bg-muted/50 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Account Type</Label>
              <Input value={aiForm.accountType} readOnly className="bg-muted/50 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">KYC Status</Label>
              <Input value={aiForm.kycStatus} readOnly className="bg-muted/50 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={aiForm.notes} readOnly rows={2} className="bg-muted/50 text-muted-foreground" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => onSubmit({ ...aiForm, performedBy: 'AI' })} disabled={isLoading} className="bg-primary text-primary-foreground">
              Create Account Request
            </Button>
            <Button size="sm" variant="outline" onClick={onSkip} disabled={isLoading}>Skip</Button>
          </div>
        </>
      )}
    </div>
  );
}