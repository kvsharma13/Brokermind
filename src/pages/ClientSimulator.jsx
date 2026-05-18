import React, { useState } from 'react';
import { brokermind } from '@/api/brokermindClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import TableSkeleton from '@/components/shared/TableSkeleton';
import { Search, AlertTriangle, User, Phone, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function ClientSimulator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => brokermind.entities.Client.list(),
  });

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.client_id.toLowerCase().includes(search.toLowerCase())
  );

  const selected = clients.find(c => c.client_id === selectedId);

  const { data: portfolio = [] } = useQuery({
    queryKey: ['portfolio', selectedId],
    queryFn: () => brokermind.entities.Portfolio.filter({ client_id: selectedId }),
    enabled: !!selectedId,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', selectedId],
    queryFn: () => brokermind.entities.Orders.filter({ client_id: selectedId }),
    enabled: !!selectedId,
  });

  const { data: margins = [] } = useQuery({
    queryKey: ['margin', selectedId],
    queryFn: () => brokermind.entities.Margin.filter({ client_id: selectedId }),
    enabled: !!selectedId,
  });

  const margin = margins[0];

  const marginCallMutation = useMutation({
    mutationFn: async () => {
      const vikram = clients.find(c => c.name === 'Vikram Singh');
      if (!vikram) return;
      const vikMargins = await brokermind.entities.Margin.filter({ client_id: vikram.client_id });
      if (vikMargins.length > 0) {
        await brokermind.entities.Margin.update(vikMargins[0].id, { available_margin: 8000, used_margin: 192000 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['margin'] });
      toast({ title: 'Margin Call Triggered', description: 'Vikram Singh\'s available margin set to ₹8,000' });
    },
  });

  const [calling, setCalling] = useState(false);

  const handleCall = async (client) => {
    setCalling(true);
    try {
      const res = await brokermind.functions.invoke('triggerBolnaCall', {
        phone: client.phone,
        client_name: client.name,
        client_id: client.client_id,
      });
      toast({ title: 'Call Queued', description: `AI is calling ${client.name} (${client.phone}). Execution ID: ${res.execution_id}` });
    } catch (err) {
      toast({ title: 'Call Failed', description: err.message, variant: 'destructive' });
    } finally {
      setCalling(false);
    }
  };

  const kycColors = { verified: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', rejected: 'bg-red-100 text-red-700' };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Client Simulator</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse mock client data for demos</p>
        </div>
        <Button variant="destructive" size="sm" className="gap-2" onClick={() => marginCallMutation.mutate()}>
          <AlertTriangle className="w-4 h-4" /> Trigger Margin Call
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {isLoading ? <TableSkeleton rows={5} cols={2} /> : (
            <div className="space-y-2">
              {filtered.map(client => (
                <Card
                  key={client.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedId === client.client_id ? 'ring-2 ring-[#4F8EF7] shadow-md' : ''}`}
                  onClick={() => setSelectedId(client.client_id)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#4F8EF7]/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#4F8EF7]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.phone}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${kycColors[client.kyc_status] || ''}`}>
                      {client.kyc_status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Client Detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <Card className="flex items-center justify-center h-64">
              <p className="text-muted-foreground text-sm">Select a client to view details</p>
            </Card>
          ) : (
            <>
              {/* Profile Card */}
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Client Profile</CardTitle>
                  <Button
                    size="sm"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleCall(selected)}
                    disabled={calling}
                  >
                    {calling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                    {calling ? 'Calling...' : 'AI Call'}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div><p className="text-xs text-muted-foreground">Name</p><p className="text-sm font-medium">{selected.name}</p></div>
                    <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm">{selected.phone}</p></div>
                    <div><p className="text-xs text-muted-foreground">PAN</p><p className="text-sm font-mono">{selected.pan}</p></div>
                    <div><p className="text-xs text-muted-foreground">KYC</p><StatusBadge status={selected.kyc_status} /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Margin */}
              {margin && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      Margin
                      {margin.available_margin < 25000 && <Badge className="bg-red-500 text-white text-xs">MARGIN CALL</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div><p className="text-xs text-muted-foreground">Total</p><p className="text-sm font-semibold">₹{margin.total_margin?.toLocaleString('en-IN')}</p></div>
                      <div><p className="text-xs text-muted-foreground">Used</p><p className="text-sm font-semibold text-amber-600">₹{margin.used_margin?.toLocaleString('en-IN')}</p></div>
                      <div><p className="text-xs text-muted-foreground">Available</p><p className={`text-sm font-semibold ${margin.available_margin < 25000 ? 'text-red-600' : 'text-emerald-600'}`}>₹{margin.available_margin?.toLocaleString('en-IN')}</p></div>
                    </div>
                    <Progress value={margin.total_margin > 0 ? (margin.used_margin / margin.total_margin) * 100 : 0} className={`h-2 ${margin.available_margin < 25000 ? '[&>div]:bg-red-500' : '[&>div]:bg-[#4F8EF7]'}`} />
                  </CardContent>
                </Card>
              )}

              {/* Portfolio */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Portfolio</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Symbol</TableHead>
                          <TableHead className="text-xs">Qty</TableHead>
                          <TableHead className="text-xs">Avg Price</TableHead>
                          <TableHead className="text-xs">LTP</TableHead>
                          <TableHead className="text-xs">P&L</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {portfolio.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm font-medium">{p.symbol}</TableCell>
                            <TableCell className="text-sm">{p.qty}</TableCell>
                            <TableCell className="text-sm">₹{p.avg_price?.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-sm">₹{p.ltp?.toLocaleString('en-IN')}</TableCell>
                            <TableCell className={`text-sm font-medium ${(p.pnl_unrealised || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {(p.pnl_unrealised || 0) >= 0 ? '+' : ''}₹{p.pnl_unrealised?.toLocaleString('en-IN')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Orders */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Orders</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Order ID</TableHead>
                          <TableHead className="text-xs">Symbol</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Qty</TableHead>
                          <TableHead className="text-xs">Price</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map(o => (
                          <TableRow key={o.id}>
                            <TableCell className="text-sm font-mono text-xs">{o.order_id}</TableCell>
                            <TableCell className="text-sm font-medium">{o.symbol}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={o.order_type === 'BUY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}>
                                {o.order_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{o.qty}</TableCell>
                            <TableCell className="text-sm">₹{o.price?.toLocaleString('en-IN')}</TableCell>
                            <TableCell><StatusBadge status={o.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}