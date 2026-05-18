import React, { useState } from 'react';
import { brokermind } from '@/api/brokermindClient';
import { useQuery } from '@tanstack/react-query';
import { Phone, ShieldCheck, AlertTriangle, Clock, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import KpiCard from '@/components/dashboard/KpiCard';
import TableSkeleton from '@/components/shared/TableSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import { parseAnalysis, triageCall, INTENT_TRIAGE_BADGE } from '@/lib/triageUtils';

const RISK_BADGE = {
  HIGH:   'bg-red-50 text-red-700 border-red-200',
  MEDIUM: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  LOW:    'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const VERIFY_BADGE = {
  VERIFIED:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  UNVERIFIED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  REJECTED:   'bg-red-50 text-red-700 border-red-200',
};

const TRIAGE_COLORS = {
  Transactional:  '#4F8EF7',
  Compliance:     '#ef4444',
  'New Account':  '#10b981',
  Informational:  '#8b5cf6',
};

export default function Overview() {
  const [alertDismissed, setAlertDismissed] = useState(false);

  const { data: recordings = [], isLoading: loadingRec } = useQuery({
    queryKey: ['recordings-overview'],
    queryFn: () => brokermind.entities.CallRecording.list('-received_at', 200),
    refetchInterval: 30000,
  });

  const { data: escalations = [] } = useQuery({
    queryKey: ['escalations-open'],
    queryFn: () => brokermind.entities.Escalation.filter({ status: 'OPEN' }),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => brokermind.entities.Client.list(),
  });

  const clientMap = {};
  clients.forEach(c => { clientMap[c.client_id] = c.name; });

  // KPI derivations
  const totalCalls = recordings.length;
  const verified = recordings.filter(r => r.verification_status === 'VERIFIED').length;
  const verifiedRate = totalCalls > 0 ? Math.round((verified / totalCalls) * 100) : 0;
  const avgDuration = totalCalls > 0
    ? Math.round(recordings.reduce((s, r) => s + (r.duration_seconds || 0), 0) / totalCalls / 60 * 10) / 10
    : 0;

  // Triage breakdown chart
  const triageCounts = { Transactional: 0, Compliance: 0, 'New Account': 0, Informational: 0 };
  recordings.forEach(r => {
    const analysis = parseAnalysis(r.ai_analysis);
    const cat = triageCall(r, analysis);
    if (cat && triageCounts[cat] !== undefined) triageCounts[cat]++;
  });
  const chartData = Object.entries(triageCounts).map(([name, count]) => ({ name, count }));

  // High-risk unverified alert
  const highRiskAlerts = recordings.filter(r => {
    if (r.verification_status !== 'UNVERIFIED') return false;
    const a = parseAnalysis(r.ai_analysis);
    return a?.has_actionable_order === true && a?.overall_risk === 'HIGH';
  });
  const alertClientNames = highRiskAlerts.map(r => clientMap[r.client_id] || r.client_id).join(', ');

  // Recent 5 calls
  const recentCalls = recordings.slice(0, 5);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* High-risk alert banner */}
      {!alertDismissed && highRiskAlerts.length > 0 && (
        <Link to="/verifications" className="block">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 hover:bg-red-100 transition-colors">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 animate-pulse" />
            <p className="flex-1 text-sm min-w-0 truncate">
              <span className="font-semibold">⚠️ {highRiskAlerts.length} high-risk order{highRiskAlerts.length > 1 ? 's' : ''} detected</span>
              <span className="ml-1 text-red-600">from {alertClientNames} — verify before placing</span>
            </p>
            <button onClick={e => { e.preventDefault(); setAlertDismissed(true); }} className="shrink-0 text-red-400 hover:text-red-700 p-0.5">
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
        <KpiCard title="Total Calls" value={totalCalls} subtitle="All recordings" icon={Phone} color="#4F8EF7" />
        <KpiCard title="Verified Rate" value={`${verifiedRate}%`} subtitle="Calls verified by agent" icon={ShieldCheck} color="#10b981" />
        <KpiCard title="Open Escalations" value={escalations.length} subtitle="Awaiting agent" icon={AlertTriangle} color="#ef4444" />
        <KpiCard title="Avg Handle Time" value={`${avgDuration}m`} subtitle="Per call" icon={Clock} color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Triage Breakdown Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Call Triage Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRec ? <TableSkeleton rows={3} cols={2} /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map(entry => (
                      <Cell key={entry.name} fill={TRIAGE_COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Calls */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Calls</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRec ? <TableSkeleton rows={5} cols={4} /> : recentCalls.length === 0 ? (
              <EmptyState message="No call recordings yet" />
            ) : (
              <div className="space-y-2.5">
                {recentCalls.map(rec => {
                  const analysis = parseAnalysis(rec.ai_analysis);
                  const triage = triageCall(rec, analysis);
                  return (
                    <Link key={rec.id} to="/verifications" className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{clientMap[rec.client_id] || rec.client_id || '—'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {analysis?.summary ? analysis.summary.slice(0, 70) + (analysis.summary.length > 70 ? '…' : '') : rec.analysis_status}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {triage && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${INTENT_TRIAGE_BADGE[triage]}`}>
                            {triage}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${VERIFY_BADGE[rec.verification_status] || ''}`}>
                          {rec.verification_status}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
