import React, { useState } from 'react';
import { brokermind } from '@/api/brokermindClient';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Shield, AlertTriangle, Clock, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import KpiCard from '@/components/dashboard/KpiCard';
import { StatusBadge, BucketBadge, ChannelIcon } from '@/components/shared/StatusBadge';
import TableSkeleton from '@/components/shared/TableSkeleton';
import EmptyState from '@/components/shared/EmptyState';

export default function Overview() {
  const { data: conversations = [], isLoading: loadingConv } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => brokermind.entities.Conversation.list('-timestamp', 100),
  });

  const { data: escalations = [], isLoading: loadingEsc } = useQuery({
    queryKey: ['escalations-open'],
    queryFn: () => brokermind.entities.Escalation.filter({ status: 'OPEN' }),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => brokermind.entities.Client.list(),
  });

  const clientMap = {};
  clients.forEach(c => { clientMap[c.client_id] = c.name; });

  const today = new Date().toISOString().split('T')[0];
  const todayConvs = conversations.filter(c => c.timestamp && c.timestamp.startsWith(today));

  const totalToday = todayConvs.length || conversations.length;
  const resolved = conversations.filter(c => c.status === 'RESOLVED').length;
  const containmentRate = conversations.length > 0 ? Math.round((resolved / conversations.length) * 100) : 0;
  const avgDuration = conversations.length > 0
    ? Math.round(conversations.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / conversations.length / 60 * 10) / 10
    : 0;

  const bucketData = [
    { bucket: 'Bucket A', count: conversations.filter(c => c.bucket === 'A').length, fill: '#10b981' },
    { bucket: 'Bucket B', count: conversations.filter(c => c.bucket === 'B').length, fill: '#f59e0b' },
    { bucket: 'Bucket C', count: conversations.filter(c => c.bucket === 'C').length, fill: '#ef4444' },
  ];

  const recentConvs = conversations.slice(0, 5);

  // High-risk unverified recordings for alert banner
  const [alertDismissed, setAlertDismissed] = useState(false);

  const { data: allRecordings = [] } = useQuery({
    queryKey: ['recordings-alert'],
    queryFn: () => brokermind.entities.CallRecording.filter({ verification_status: 'UNVERIFIED' }),
    refetchInterval: 30000,
  });

  const highRiskAlerts = allRecordings.filter(r => {
    if (!r.ai_analysis) return false;
    try {
      const a = typeof r.ai_analysis === 'string' ? JSON.parse(r.ai_analysis) : r.ai_analysis;
      return a.has_actionable_order === true && a.overall_risk === 'HIGH';
    } catch { return false; }
  });

  const clientNames = highRiskAlerts.map(r => clientMap[r.client_id] || r.client_id).join(', ');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Single compact alert banner */}
      {!alertDismissed && highRiskAlerts.length > 0 && (
        <Link to="/verifications" className="block">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 hover:bg-red-100 transition-colors">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 animate-pulse" />
            <p className="flex-1 text-sm min-w-0 truncate">
              <span className="font-semibold">⚠️ {highRiskAlerts.length} high-risk order{highRiskAlerts.length > 1 ? 's' : ''} detected</span>
              <span className="ml-1 text-red-600">from {clientNames} — verify before placing</span>
            </p>
            <button
              onClick={e => { e.preventDefault(); setAlertDismissed(true); }}
              className="shrink-0 text-red-400 hover:text-red-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </Link>
      )}

      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time AI agent performance metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Conversations" value={totalToday} subtitle="All sessions" icon={MessageSquare} color="#4F8EF7" />
        <KpiCard title="Containment Rate" value={`${containmentRate}%`} subtitle="Resolved without escalation" icon={Shield} color="#10b981" />
        <KpiCard title="Open Escalations" value={escalations.length} subtitle="Awaiting agent" icon={AlertTriangle} color="#ef4444" />
        <KpiCard title="Avg Handle Time" value={`${avgDuration}m`} subtitle="Per conversation" icon={Clock} color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bucket Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Query Bucket Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingConv ? <TableSkeleton rows={3} cols={2} /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={bucketData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="bucket" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingConv ? <TableSkeleton rows={5} cols={4} /> : recentConvs.length === 0 ? (
              <EmptyState message="No conversations yet — waiting for BrokerMind agent calls" />
            ) : (
              <div className="space-y-3">
                {recentConvs.map(conv => (
                  <div key={conv.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <ChannelIcon channel={conv.channel} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{clientMap[conv.client_id] || conv.client_id}</p>
                      <p className="text-xs text-muted-foreground truncate">{conv.summary}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <BucketBadge bucket={conv.bucket} />
                      <StatusBadge status={conv.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}