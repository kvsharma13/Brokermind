import React, { useState, useEffect } from 'react';
import { brokermind } from '@/api/brokermindClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { RefreshCw, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import TableSkeleton from '@/components/shared/TableSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import TicketWorkflowModal from '@/components/tickets/TicketWorkflowModal';

const PRIORITY_BADGE = {
  URGENT: 'bg-red-50 text-red-700 border-red-200',
  NORMAL: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const STATUS_BADGE = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ESCALATED: 'bg-red-50 text-red-700 border-red-200',
};

const SOURCE_BADGE = {
  CALL: 'bg-blue-50 text-blue-700 border-blue-200',
  EMAIL: 'bg-purple-50 text-purple-700 border-purple-200',
};

const STATUS_COUNTS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'];

function SummaryBar({ tickets, activeStatus, onFilter }) {
  const total = tickets.length;
  const counts = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, ESCALATED: 0 };
  tickets.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <button
        onClick={() => onFilter('ALL')}
        className={`rounded-xl border p-4 text-left transition-all ${activeStatus === 'ALL' ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted/50'}`}
      >
        <p className="text-2xl font-bold">{total}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Total</p>
      </button>
      {STATUS_COUNTS.map(s => (
        <button
          key={s}
          onClick={() => onFilter(s)}
          className={`rounded-xl border p-4 text-left transition-all ${activeStatus === s ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted/50'}`}
        >
          <p className="text-2xl font-bold">{counts[s]}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{s.replace('_', ' ')}</p>
        </button>
      ))}
    </div>
  );
}

function UpdatePanel({ ticket, onClose }) {
  const [form, setForm] = useState({
    status: ticket.status,
    assigned_to: ticket.assigned_to || '',
    resolution_notes: ticket.resolution_notes || '',
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const update = {
      status: form.status,
      assigned_to: form.assigned_to,
      resolution_notes: form.resolution_notes,
      updated_at: now,
    };
    if (form.status === 'RESOLVED' && ticket.status !== 'RESOLVED') {
      update.resolved_at = now;
    }
    await brokermind.entities.Ticket.update(ticket.id, update);
    toast({ title: 'Ticket updated' });
    qc.invalidateQueries({ queryKey: ['tickets'] });
    setSaving(false);
    onClose();
  };

  return (
    <div className="bg-muted/30 border-t px-6 py-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'].map(s => (
                <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Assigned To</Label>
          <Input value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} placeholder="Agent name" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Resolution Notes</Label>
          <Textarea value={form.resolution_notes} onChange={e => setForm(p => ({ ...p, resolution_notes: e.target.value }))} rows={2} placeholder="Notes..." />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>Save Changes</Button>
        <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

function DetailPanel({ ticket }) {
  return (
    <div className="bg-muted/20 border-t px-6 py-4 space-y-3 text-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div><p className="text-xs text-muted-foreground">Source ID</p><p className="font-mono text-xs">{ticket.source_id ? ticket.source_id.replace(/^bolna-/i, '') : '—'}</p></div>
        <div><p className="text-xs text-muted-foreground">Performed Action ID</p><p className="font-mono text-xs">{ticket.performed_action_id || '—'}</p></div>
        <div><p className="text-xs text-muted-foreground">Created At</p><p>{ticket.created_at ? format(new Date(ticket.created_at), 'MMM d, yyyy HH:mm') : '—'}</p></div>
        <div><p className="text-xs text-muted-foreground">Resolved At</p><p>{ticket.resolved_at ? format(new Date(ticket.resolved_at), 'MMM d, yyyy HH:mm') : '—'}</p></div>
        <div><p className="text-xs text-muted-foreground">Client Email</p><p>{ticket.client_email || '—'}</p></div>
        <div><p className="text-xs text-muted-foreground">Assigned To</p><p>{ticket.assigned_to || '—'}</p></div>
        <div><p className="text-xs text-muted-foreground">Resolution Notes</p><p>{ticket.resolution_notes || '—'}</p></div>
      </div>
      {ticket.raw_summary && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">AI Summary</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap bg-card border rounded-lg p-3">{ticket.raw_summary}</p>
        </div>
      )}
    </div>
  );
}

export default function TicketTracker() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [updatePanelId, setUpdatePanelId] = useState(null);
  const [workflowTicket, setWorkflowTicket] = useState(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  // Silent background sync on every page load
  useEffect(() => {
    const storedEmails = (() => {
      try {
        const raw = localStorage.getItem('mailsort_triaged_emails');
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })();

    const emails = storedEmails.map(e => ({
      source_id: e.id,
      priority: e.priority,
      category: e.category,
      subject: e.subject,
      client_email: e.from || '',
      client_name: e.from ? e.from.split('@')[0] : '',
      raw_summary: e.reasoning || '',
    }));

    brokermind.functions.invoke('ticketAutomation', { event_type: 'bulk_sync', emails })
      .then(() => qc.invalidateQueries({ queryKey: ['tickets'] }))
      .catch(() => {});
  }, []);

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => brokermind.entities.Ticket.list('-created_at', 200),
    refetchInterval: 30000,
  });

  const categories = [...new Set(tickets.map(t => t.category).filter(Boolean))];

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (sourceFilter !== 'ALL' && t.source !== sourceFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match = [t.client_name, t.client_phone, t.client_email, t.subject, t.ticket_id]
        .filter(Boolean).some(f => f.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);
  const toggleUpdate = (id, e) => {
    e.stopPropagation();
    setUpdatePanelId(prev => prev === id ? null : id);
    setExpandedId(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ticket Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all support tickets created from calls and emails</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <SummaryBar tickets={tickets} activeStatus={statusFilter} onFilter={setStatusFilter} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name, phone, email, subject..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            <SelectItem value="CALL">Call</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priority</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} cols={9} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState message="No tickets found" />
          ) : (
            <div className="w-full">
              <Table className="text-xs w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="text-xs w-[90px]">Ticket ID</TableHead>
                    <TableHead className="text-xs w-[90px]">Created</TableHead>
                    <TableHead className="text-xs w-[60px]">Source</TableHead>
                    <TableHead className="text-xs w-[100px]">Client</TableHead>
                    <TableHead className="text-xs w-[110px]">Category</TableHead>
                    <TableHead className="text-xs">Subject</TableHead>
                    <TableHead className="text-xs w-[70px]">Priority</TableHead>
                    <TableHead className="text-xs w-[90px]">Status</TableHead>
                    <TableHead className="text-xs w-[130px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(ticket => (
                    <React.Fragment key={ticket.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => toggleExpand(ticket.id)}
                      >
                        <TableCell className="w-8">
                          {expandedId === ticket.id
                            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold truncate">{ticket.ticket_id}</TableCell>
                        <TableCell className="text-xs">{ticket.created_at ? format(new Date(ticket.created_at), 'MMM d, HH:mm') : '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${SOURCE_BADGE[ticket.source] || ''}`}>{ticket.source}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium truncate">{ticket.client_name || '—'}</TableCell>
                        <TableCell className="text-xs truncate">{ticket.category || '—'}</TableCell>
                        <TableCell className="text-xs truncate">{ticket.subject || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${PRIORITY_BADGE[ticket.priority] || ''}`}>{ticket.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${STATUS_BADGE[ticket.status] || ''}`}>{ticket.status?.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm" variant="outline" className="text-xs gap-1 h-7 px-2"
                              onClick={e => { e.stopPropagation(); setWorkflowTicket(ticket); }}
                            >
                              <Eye className="w-3 h-3" /> View
                            </Button>
                            <Button
                              size="sm" variant="outline" className="text-xs h-7 px-2"
                              onClick={e => toggleUpdate(ticket.id, e)}
                            >
                              Update
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {updatePanelId === ticket.id && (
                        <TableRow>
                          <TableCell colSpan={10} className="p-0">
                            <UpdatePanel ticket={ticket} onClose={() => setUpdatePanelId(null)} />
                          </TableCell>
                        </TableRow>
                      )}
                      {expandedId === ticket.id && (
                        <TableRow>
                          <TableCell colSpan={10} className="p-0">
                            <DetailPanel ticket={ticket} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TicketWorkflowModal
        ticket={workflowTicket}
        open={!!workflowTicket}
        onClose={() => setWorkflowTicket(null)}
      />
    </div>
  );
}