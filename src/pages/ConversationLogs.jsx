import React, { useState } from 'react';
import { brokermind } from '@/api/brokermindClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StatusBadge, BucketBadge, ChannelIcon } from '@/components/shared/StatusBadge';
import TableSkeleton from '@/components/shared/TableSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import { format } from 'date-fns';
import { MessageSquare } from 'lucide-react';

export default function ConversationLogs() {
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [bucketFilter, setBucketFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => brokermind.entities.Conversation.list('-timestamp', 100),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => brokermind.entities.Client.list(),
  });

  const clientMap = {};
  clients.forEach(c => { clientMap[c.client_id] = c; });

  const filtered = conversations.filter(c => {
    if (channelFilter !== 'ALL' && c.channel !== channelFilter) return false;
    if (bucketFilter !== 'ALL' && c.bucket !== bucketFilter) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conversation Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} conversation{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Channels</SelectItem>
            <SelectItem value="VOICE">Voice</SelectItem>
            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
            <SelectItem value="WEBCHAT">WebChat</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bucketFilter} onValueChange={setBucketFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Bucket" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Buckets</SelectItem>
            <SelectItem value="A">Bucket A</SelectItem>
            <SelectItem value="B">Bucket B</SelectItem>
            <SelectItem value="C">Bucket C</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="ESCALATED">Escalated</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={6} cols={6} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState message="No conversations yet — waiting for BrokerMind agent calls" icon={MessageSquare} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Timestamp</TableHead>
                    <TableHead className="text-xs">Client</TableHead>
                    <TableHead className="text-xs">Channel</TableHead>
                    <TableHead className="text-xs">Bucket</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(conv => (
                    <TableRow key={conv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(conv)}>
                      <TableCell className="text-sm">{conv.timestamp ? format(new Date(conv.timestamp), 'MMM d, HH:mm') : '-'}</TableCell>
                      <TableCell className="text-sm font-medium">{clientMap[conv.client_id]?.name || conv.client_id}</TableCell>
                      <TableCell><ChannelIcon channel={conv.channel} /></TableCell>
                      <TableCell><BucketBadge bucket={conv.bucket} /></TableCell>
                      <TableCell><StatusBadge status={conv.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{conv.duration_seconds ? `${Math.round(conv.duration_seconds / 60)}m` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Side Panel */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Conversation Details</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="space-y-5 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="text-sm font-medium">{clientMap[selected.client_id]?.name || selected.client_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm">{clientMap[selected.client_id]?.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Channel</p>
                  <div className="flex items-center gap-1.5 mt-0.5"><ChannelIcon channel={selected.channel} /><span className="text-sm">{selected.channel}</span></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bucket</p>
                  <div className="mt-0.5"><BucketBadge bucket={selected.bucket} /></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-0.5"><StatusBadge status={selected.status} /></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm">{selected.duration_seconds ? `${Math.round(selected.duration_seconds / 60)} minutes` : '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Summary</p>
                <p className="text-sm bg-muted p-3 rounded-lg">{selected.summary}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Transcript</p>
                <pre className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap font-mono text-xs leading-relaxed">{selected.transcript}</pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}