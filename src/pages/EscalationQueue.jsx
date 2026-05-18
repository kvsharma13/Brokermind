import React, { useState } from 'react';
import { brokermind } from '@/api/brokermindClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, RefreshCw, UserPlus, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import TableSkeleton from '@/components/shared/TableSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function EscalationQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEsc, setSelectedEsc] = useState(null);

  const { data: escalations = [], isLoading, refetch } = useQuery({
    queryKey: ['escalations'],
    queryFn: () => brokermind.entities.Escalation.list('-created_date', 50),
    refetchInterval: 30000,
  });

  const { data: escalatedTickets = [] } = useQuery({
    queryKey: ['escalated-tickets'],
    queryFn: () => brokermind.entities.Ticket.filter({ status: 'ESCALATED' }),
    refetchInterval: 30000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => brokermind.entities.Client.list(),
  });

  const clientMap = {};
  clients.forEach(c => { clientMap[c.client_id] = c; });

  // Build unified list: Escalation records + ESCALATED tickets not already covered
  const escalationSessionIds = new Set(escalations.map(e => e.session_id).filter(Boolean));
  const ticketOnlyEscalations = escalatedTickets
    .filter(t => !escalationSessionIds.has(t.source_id))
    .map(t => ({
      id: 'ticket-' + t.id,
      _ticket: t,
      client_id: null,
      reason: t.subject || t.category,
      handoff_context: t.raw_summary || '',
      status: 'OPEN',
      assigned_agent: t.assigned_to || null,
      created_date: t.created_at || t.created_date,
      resolved_at: null,
    }));

  const allEscalations = [...escalations, ...ticketOnlyEscalations];

  const resolveTicketMutation = useMutation({
    mutationFn: ({ ticketId }) => brokermind.entities.Ticket.update(ticketId, { status: 'RESOLVED', resolved_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalated-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['open-escalations-count'] });
      toast({ title: 'Resolved', description: 'Ticket marked as resolved' });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id }) => brokermind.entities.Escalation.update(id, { assigned_agent: 'Current User', status: 'IN_PROGRESS' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalations'] });
      queryClient.invalidateQueries({ queryKey: ['open-escalations-count'] });
      toast({ title: 'Assigned to you', description: 'Escalation assigned successfully' });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id }) => brokermind.entities.Escalation.update(id, { status: 'RESOLVED', resolved_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalations'] });
      queryClient.invalidateQueries({ queryKey: ['open-escalations-count'] });
      toast({ title: 'Resolved', description: 'Escalation marked as resolved' });
    },
  });

  const activeEscalations = allEscalations.filter(e => e.status !== 'RESOLVED');
  const resolvedEscalations = allEscalations.filter(e => e.status === 'RESOLVED');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Escalation Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">{activeEscalations.length} active escalation{activeEscalations.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Active Escalations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <TableSkeleton rows={4} cols={6} /> : activeEscalations.length === 0 ? (
            <EmptyState message="No active escalations — all clear!" icon={CheckCircle2} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs">Client</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Agent</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeEscalations.map(esc => {
                    const isTicketRow = !!esc._ticket;
                    const client = clientMap[esc.client_id];
                    const clientName = isTicketRow ? (esc._ticket.client_name || '—') : (client?.name || esc.client_id);
                    const clientPhone = isTicketRow ? (esc._ticket.client_phone || '-') : (client?.phone || '-');
                    return (
                      <TableRow key={esc.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEsc(esc)}>
                        <TableCell className="text-sm">{esc.created_date ? format(new Date(esc.created_date), 'MMM d, HH:mm') : '-'}</TableCell>
                        <TableCell className="text-sm font-medium">{clientName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{clientPhone}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{esc.reason}</TableCell>
                        <TableCell><StatusBadge status={esc.status} /></TableCell>
                        <TableCell className="text-sm">{esc.assigned_agent || '—'}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2">
                            {!isTicketRow && esc.status === 'OPEN' && (
                              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => assignMutation.mutate({ id: esc.id })}>
                                <UserPlus className="w-3 h-3" /> Assign
                              </Button>
                            )}
                            {esc.status !== 'RESOLVED' && (
                              <Button size="sm" variant="outline" className="text-xs gap-1 text-emerald-600" onClick={() => {
                                if (isTicketRow) resolveTicketMutation.mutate({ ticketId: esc._ticket.id });
                                else resolveMutation.mutate({ id: esc.id });
                              }}>
                                <CheckCircle2 className="w-3 h-3" /> Resolve
                              </Button>
                            )}
                          </div>
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

      {resolvedEscalations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-muted-foreground">Recently Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Client</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs">Resolved At</TableHead>
                    <TableHead className="text-xs">Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedEscalations.map(esc => {
                    const clientName = esc._ticket ? (esc._ticket.client_name || '—') : (clientMap[esc.client_id]?.name || esc.client_id);
                    return (
                      <TableRow key={esc.id} className="opacity-60">
                        <TableCell className="text-sm">{clientName}</TableCell>
                        <TableCell className="text-sm truncate max-w-[250px]">{esc.reason}</TableCell>
                        <TableCell className="text-sm">{esc.resolved_at ? format(new Date(esc.resolved_at), 'MMM d, HH:mm') : '-'}</TableCell>
                        <TableCell className="text-sm">{esc.assigned_agent || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedEsc} onOpenChange={() => setSelectedEsc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Escalation Details</DialogTitle>
          </DialogHeader>
          {selectedEsc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="text-sm font-medium">
                    {selectedEsc._ticket ? (selectedEsc._ticket.client_name || '—') : (clientMap[selectedEsc.client_id]?.name || selectedEsc.client_id)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={selectedEsc.status} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reason</p>
                <p className="text-sm">{selectedEsc.reason}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Handoff Context</p>
                <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">{selectedEsc.handoff_context}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}