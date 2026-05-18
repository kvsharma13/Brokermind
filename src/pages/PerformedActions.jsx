import React, { useState } from 'react';
import { brokermind } from '@/api/brokermindClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ClipboardList, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';
import TableSkeleton from '@/components/shared/TableSkeleton';
import { INTENT_TRIAGE_BADGE } from '@/lib/triageUtils';

const ACTION_BADGE = {
  ORDER_PLACED:           'bg-blue-50 text-blue-700 border-blue-200',
  QUERY_RESOLVED:         'bg-gray-50 text-gray-600 border-gray-200',
  ACCOUNT_FLAGGED:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  COMPLIANCE_ESCALATED:   'bg-red-50 text-red-700 border-red-200',
};

const STATUS_BADGE = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING:   'bg-amber-50 text-amber-700 border-amber-200',
  FAILED:    'bg-red-50 text-red-700 border-red-200',
};

function parseDetails(str) {
  if (!str) return null;
  try { return typeof str === 'string' ? JSON.parse(str) : str; }
  catch { return null; }
}

function ActionDetailInline({ action_type, action_details }) {
  const d = parseDetails(action_details);
  if (!d) return <span className="text-muted-foreground text-xs">—</span>;

  if (action_type === 'ORDER_PLACED') {
    return (
      <span className="text-xs font-mono">
        {d.orderType} {d.symbol} × {d.qty} @ ₹{d.price}
      </span>
    );
  }
  const text = d.summary || d.recommended_action || JSON.stringify(d);
  return <span className="text-xs text-muted-foreground">{text.slice(0, 100)}{text.length > 100 ? '…' : ''}</span>;
}

function ExpandedDetails({ action_details }) {
  const d = parseDetails(action_details);
  if (!d) return null;
  return (
    <pre className="text-xs bg-muted rounded p-3 mt-2 whitespace-pre-wrap overflow-auto max-h-40">
      {JSON.stringify(d, null, 2)}
    </pre>
  );
}

export default function PerformedActions() {
  const [triageFilter, setTriageFilter] = useState('ALL');
  const [performerFilter, setPerformerFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);

  const { data: actions = [], isLoading, refetch } = useQuery({
    queryKey: ['performed-actions'],
    queryFn: () => brokermind.entities.PerformedAction.list('-performed_at', 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => brokermind.entities.Client.list(),
  });

  const clientMap = {};
  clients.forEach(c => { clientMap[c.client_id] = c; });

  const filtered = actions.filter(a => {
    if (triageFilter !== 'ALL' && a.triage_type !== triageFilter) return false;
    if (performerFilter === 'AI' && a.performed_by !== 'AI') return false;
    if (performerFilter === 'Human' && a.performed_by === 'AI') return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Performed Actions</h1>
          <p className="text-sm text-muted-foreground mt-1">All actions taken on verified call recordings</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={triageFilter} onValueChange={setTriageFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Triage Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Triage Types</SelectItem>
            <SelectItem value="Transactional">Transactional</SelectItem>
            <SelectItem value="Informational">Informational</SelectItem>
            <SelectItem value="New Account">New Account</SelectItem>
            <SelectItem value="Compliance">Compliance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={performerFilter} onValueChange={setPerformerFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Performed By" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Performers</SelectItem>
            <SelectItem value="AI">AI Only</SelectItem>
            <SelectItem value="Human">Human Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} cols={7} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState message="No actions recorded yet" icon={ClipboardList} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8"></TableHead>
                    <TableHead className="text-xs">Performed At</TableHead>
                    <TableHead className="text-xs">Client</TableHead>
                    <TableHead className="text-xs">Triage Type</TableHead>
                    <TableHead className="text-xs">Action Type</TableHead>
                    <TableHead className="text-xs">Action Details</TableHead>
                    <TableHead className="text-xs">Performed By</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(action => {
                    const client = clientMap[action.client_id];
                    const isExpanded = expandedId === action.id;
                    return (
                      <React.Fragment key={action.id}>
                        <TableRow className="hover:bg-muted/40 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : action.id)}>
                          <TableCell className="text-muted-foreground">
                            {isExpanded
                              ? <ChevronDown className="w-3.5 h-3.5" />
                              : <ChevronRight className="w-3.5 h-3.5" />}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {action.performed_at ? format(new Date(action.performed_at), 'MMM d, HH:mm') : '—'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{client?.name || action.client_id}</p>
                              <p className="text-xs text-muted-foreground">{client?.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs font-semibold ${INTENT_TRIAGE_BADGE[action.triage_type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                              {action.triage_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs font-semibold ${ACTION_BADGE[action.action_type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                              {(action.action_type || '').replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[240px]">
                            <ActionDetailInline action_type={action.action_type} action_details={action.action_details} />
                          </TableCell>
                          <TableCell>
                            {action.performed_by === 'AI' ? (
                              <Badge className="bg-blue-600 text-white text-xs px-2 hover:bg-blue-600">AI</Badge>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">Human</Badge>
                                <span className="text-xs text-muted-foreground">{action.performed_by}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs font-semibold ${STATUS_BADGE[action.status] || ''}`}>
                              {action.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/20">
                            <TableCell colSpan={8} className="px-6 pb-4">
                              <ExpandedDetails action_details={action.action_details} />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}