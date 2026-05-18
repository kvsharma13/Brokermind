import React, { useState, useEffect, useRef } from 'react';
import { brokermind } from '@/api/brokermindClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { RefreshCw, Eye, Mic, Trash2, Download, Loader2, FlaskConical } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import EmptyState from '@/components/shared/EmptyState';
import TableSkeleton from '@/components/shared/TableSkeleton';
import RecordingDetail from './RecordingDetail';
import { triageCall as triageCallUtil, parseAnalysis as parseAnalysisUtil, INTENT_TRIAGE_BADGE } from '@/lib/triageUtils';

const RISK_BADGE = {
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const VERIFY_BADGE = {
  UNVERIFIED: 'bg-amber-50 text-amber-700 border-amber-200',
  VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

const TRIAGE_BADGE = {
  'BUY_ORDER': 'bg-blue-50 text-blue-700 border-blue-200',
  'SELL_ORDER': 'bg-purple-50 text-purple-700 border-purple-200',
  'MARGIN_CALL': 'bg-orange-50 text-orange-700 border-orange-200',
  'ACCOUNT_QUERY': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'OTHER': 'bg-gray-50 text-gray-700 border-gray-200',
};

const PRIORITY_BADGE = {
  URGENT: 'bg-red-50 text-red-700 border-red-200',
  NORMAL: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};



function classifyCall(analysis) {
  if (!analysis) return 'OTHER';
  
  const extractions = analysis.extractions || [];
  const summary = (analysis.summary || '').toLowerCase();
  
  if (summary.includes('margin') || summary.includes('margin call')) return 'MARGIN_CALL';
  
  const hasBuy = extractions.some(e => e.type === 'BUY_ORDER' || (e.quote && e.quote.toLowerCase().includes('buy')));
  const hasSell = extractions.some(e => e.type === 'SELL_ORDER' || (e.quote && e.quote.toLowerCase().includes('sell')));
  
  if (hasBuy) return 'BUY_ORDER';
  if (hasSell) return 'SELL_ORDER';
  
  if (summary.includes('account') || summary.includes('kyc') || summary.includes('demat')) return 'ACCOUNT_QUERY';
  
  return 'OTHER';
}

function formatDuration(secs) {
  if (!secs) return '-';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const parseAnalysis = parseAnalysisUtil;
const triageCall = (rec, analysis) => triageCallUtil(rec, analysis);

export default function CallVerifications() {
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [subCategoryFilter, setSubCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulateText, setSimulateText] = useState('');
  const [simulateLoading, setSimulateLoading] = useState(false);
  const prevIdsRef = useRef(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: recordings = [], isLoading, refetch } = useQuery({
    queryKey: ['recordings'],
    queryFn: async () => {
      const recs = await brokermind.entities.CallRecording.list('-received_at', 100);
      
      // Check if backfill is needed
      const needsBackfill = recs.some(r => !r.sub_category && r.ai_analysis && r.analysis_status === 'DONE');
      
      if (needsBackfill) {
        try {
          await brokermind.functions.invoke('backfillCallRecordings', {});
          return brokermind.entities.CallRecording.list('-received_at', 100);
        } catch (e) {
          console.error('Backfill failed:', e);
          return recs;
        }
      }
      
      return recs;
    },
    refetchInterval: 30000,
    staleTime: 0,
    gcTime: 0,
  });

  // Track last updated time and detect new records
  useEffect(() => {
    if (!recordings) return;
    setLastUpdated(new Date());
    setSecondsAgo(0);

    const currentIds = new Set(recordings.map(r => r.id));
    if (prevIdsRef.current !== null) {
      const newOnes = recordings.filter(r => !prevIdsRef.current.has(r.id));
      if (newOnes.length > 0) {
        toast({
          title: 'New call recording received',
          description: `${newOnes.length} new recording${newOnes.length > 1 ? 's' : ''} added`,
          duration: 4000,
        });
      }
    }
    prevIdsRef.current = currentIds;
  }, [recordings]);

  // Tick "seconds ago" counter
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) {
        setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => brokermind.entities.Client.list(),
  });

  const clientMap = {};
  clients.forEach(c => { clientMap[c.client_id] = c; });

  // Sort: UNVERIFIED first, then by received_at desc
  const sorted = [...recordings].sort((a, b) => {
    if (a.verification_status === 'UNVERIFIED' && b.verification_status !== 'UNVERIFIED') return -1;
    if (a.verification_status !== 'UNVERIFIED' && b.verification_status === 'UNVERIFIED') return 1;
    return new Date(b.received_at || 0) - new Date(a.received_at || 0);
  });

  const filtered = sorted.filter(r => {
    const analysis = parseAnalysis(r.ai_analysis);
    if (riskFilter !== 'ALL' && analysis?.overall_risk !== riskFilter) return false;
    if (statusFilter !== 'ALL' && r.verification_status !== statusFilter) return false;
    if (subCategoryFilter !== 'ALL' && r.sub_category !== subCategoryFilter) return false;
    if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false;
    return true;
  });

  // Collect unique sub_categories for filter
  const uniqueSubCategories = [...new Set(sorted.map(r => r.sub_category).filter(Boolean))].sort();

  const handleSimulate = async () => {
    if (!simulateText.trim()) return;
    setSimulateLoading(true);
    try {
      const res = await brokermind.functions.invoke('simulateCall', { transcript: simulateText.trim() });
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      toast({
        title: 'Call Simulated',
        description: `AI analysis ${res.analysis_status === 'DONE' ? 'complete' : 'queued'}. Recording added to the list.`,
        duration: 4000,
      });
      setSimulateOpen(false);
      setSimulateText('');
    } catch (err) {
      toast({ title: 'Simulation Failed', description: err.message, variant: 'destructive', duration: 3000 });
    } finally {
      setSimulateLoading(false);
    }
  };

  const handleDelete = async (id) => {
    await brokermind.entities.CallRecording.delete(id);
    queryClient.invalidateQueries({ queryKey: ['recordings'] });
  };

  const handleSyncBolna = async () => {
    setSyncLoading(true);
    try {
      const res = await brokermind.functions.invoke('syncBolnaCalls', {});
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      if (res?.error) {
        toast({ title: 'Sync Failed', description: res.error, variant: 'destructive', duration: 5000 });
      } else {
        toast({
          title: 'Sync Complete',
          description: `Synced ${res.synced ?? 0} new recordings, ${res.skipped ?? 0} skipped`,
          duration: 3000,
        });
      }
    } catch (err) {
      toast({
        title: 'Sync Failed',
        description: err.message || 'Failed to sync from Bolna',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setSyncLoading(false);
    }
  };

  if (selectedId) {
    return (
      <RecordingDetail
        recordingId={selectedId}
        onBack={() => setSelectedId(null)}
        clientMap={clientMap}
      />
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Call Recording Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-analyzed call recordings awaiting ops verification</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSimulateOpen(true)} className="gap-2">
            <FlaskConical className="w-4 h-4" /> Simulate
          </Button>
          <Button variant="outline" size="sm" onClick={handleSyncBolna} disabled={syncLoading} className="gap-2">
            {syncLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Sync
          </Button>
          <div className="flex flex-col items-end gap-0.5">
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['recordings'] })} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Risk Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Risk</SelectItem>
            <SelectItem value="HIGH">High Risk</SelectItem>
            <SelectItem value="MEDIUM">Medium Risk</SelectItem>
            <SelectItem value="LOW">Low Risk</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Verification" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="UNVERIFIED">Unverified</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Sub Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sub Categories</SelectItem>
            {uniqueSubCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priority</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} cols={7} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState message="No call recordings yet — waiting for Bolna to send recordings" icon={Mic} />
          ) : (
            <div className="w-full">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                     <TableHead className="text-xs whitespace-nowrap">Received At</TableHead>
                     <TableHead className="text-xs">Client</TableHead>
                     <TableHead className="text-xs">Dur.</TableHead>
                     <TableHead className="text-xs">AI Summary</TableHead>
                        <TableHead className="text-xs whitespace-nowrap">Action Type</TableHead>
                        <TableHead className="text-xs">Triage</TableHead>
                        <TableHead className="text-xs whitespace-nowrap">Sub Category</TableHead>
                        <TableHead className="text-xs">Risk</TableHead>
                        <TableHead className="text-xs">Priority</TableHead>
                     <TableHead className="text-xs">Ext.</TableHead>
                     <TableHead className="text-xs">Status</TableHead>
                     <TableHead className="text-xs">Review</TableHead>
                     <TableHead className="text-xs"></TableHead>
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {filtered.map(rec => {
                    const analysis = parseAnalysis(rec.ai_analysis);
                    const client = clientMap[rec.client_id];
                    return (
                      <TableRow key={rec.id} className="hover:bg-muted/40">
                        <TableCell className="text-xs whitespace-nowrap">{rec.received_at ? format(new Date(rec.received_at), 'MMM d, HH:mm') : '-'}</TableCell>
                        <TableCell>
                          <p className="text-xs font-mono">{rec.client_id || '—'}</p>
                        </TableCell>
                        <TableCell className="text-xs font-mono whitespace-nowrap">{formatDuration(rec.duration_seconds)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                          {analysis?.summary ? analysis.summary.slice(0, 60) + (analysis.summary.length > 60 ? '…' : '') : rec.analysis_status}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs font-semibold ${TRIAGE_BADGE[classifyCall(analysis)]}`}>
                            {classifyCall(analysis).replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                         <TableCell>
                           {(() => {
                             const triage = triageCall(rec, analysis);
                             if (!triage) return <Badge variant="outline" className="text-xs bg-gray-50 text-gray-400 border-gray-200">Analyzing…</Badge>;
                             return <Badge variant="outline" className={`text-xs font-semibold ${INTENT_TRIAGE_BADGE[triage]}`}>{triage}</Badge>;
                           })()}
                         </TableCell>
                        <TableCell>
                          {rec.sub_category ? (
                            <Badge variant="outline" className="text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                              {rec.sub_category}
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {analysis?.overall_risk ? (
                            <Badge variant="outline" className={`text-xs font-semibold ${RISK_BADGE[analysis.overall_risk]}`}>
                              {analysis.overall_risk}
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {rec.priority ? (
                            <Badge variant="outline" className={`text-xs font-semibold ${PRIORITY_BADGE[rec.priority] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                              {rec.priority}
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-center font-semibold">
                          {analysis?.extractions?.length ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${VERIFY_BADGE[rec.verification_status] || ''}`}>
                            {rec.verification_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setSelectedId(rec.id)}>
                            <Eye className="w-3.5 h-3.5" /> Review
                          </Button>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Recording?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this call recording and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(rec.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simulate Call Dialog */}
      <Dialog open={simulateOpen} onOpenChange={setSimulateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" /> Simulate Call Transcript
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Paste any call transcript below. Format each line as <code className="bg-muted px-1 rounded text-xs">user: ...</code> or <code className="bg-muted px-1 rounded text-xs">assistant: ...</code>. The AI will classify, extract, and add it to the verification queue.
          </p>
          <Textarea
            placeholder={`user: I want to buy 100 shares of Reliance at market price\nassistant: Sure, I can help with that. Do you want to place a market order?\nuser: Yes, please go ahead with CNC order`}
            className="min-h-[200px] font-mono text-sm"
            value={simulateText}
            onChange={e => setSimulateText(e.target.value)}
          />
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={handleSimulate}
              disabled={simulateLoading || simulateText.trim().length < 10}
              className="gap-2"
            >
              {simulateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              {simulateLoading ? 'Analyzing...' : 'Run AI Pipeline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}