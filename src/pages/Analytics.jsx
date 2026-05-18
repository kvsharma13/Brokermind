import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, IndianRupee, AlertTriangle, Bot, User, Phone, Mail } from 'lucide-react';
import { brokermind } from '@/api/brokermindClient';
import { useQuery } from '@tanstack/react-query';
import AISuggestionsPanel from '@/components/analytics/AISuggestionsPanel';
import AILearningLog from '@/components/analytics/AILearningLog';

const CATEGORY_COLORS = ['#4F8EF7', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
const RISK_COLORS = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function statCard(icon, label, value, sub, colorClass) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets-analytics'],
    queryFn: () => brokermind.entities.Ticket.list('-created_at', 500),
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['actions-analytics'],
    queryFn: () => brokermind.entities.PerformedAction.list('-performed_at', 500),
  });

  const { data: calls = [] } = useQuery({
    queryKey: ['calls-analytics'],
    queryFn: () => brokermind.entities.CallRecording.list('-received_at', 500),
  });

  const { data: emails = [] } = useQuery({
    queryKey: ['emails-analytics'],
    queryFn: () => brokermind.entities.Email.list('-received_at', 500),
  });

  // ── Stat cards ──────────────────────────────────────────────────────────────
  const totalInteractions = calls.length + emails.length;
  const analyzedCalls = calls.filter(c => c.analysis_status === 'DONE').length;
  const verifiedCalls = calls.filter(c => c.verification_status === 'VERIFIED').length;
  const urgentEmails = emails.filter(e => e.priority === 'URGENT').length;

  // ── Calls per day (last 7 days) ─────────────────────────────────────────────
  const callsByDay = DAYS.map(d => ({ day: d, calls: 0, emails: 0 }));
  calls.forEach(c => {
    if (!c.received_at) return;
    const d = new Date(c.received_at).getDay();
    callsByDay[d].calls++;
  });
  emails.forEach(e => {
    if (!e.received_at) return;
    const d = new Date(e.received_at).getDay();
    callsByDay[d].emails++;
  });
  // Rotate so Mon is first
  const dailyData = [...callsByDay.slice(1), callsByDay[0]];

  // ── Query type breakdown (calls + emails combined) ─────────────────────────
  const typeCounts = {};
  calls.forEach(c => {
    if (!c.ai_analysis) return;
    try {
      const a = typeof c.ai_analysis === 'string' ? JSON.parse(c.ai_analysis) : c.ai_analysis;
      const t = a?.call_type || 'Unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    } catch { typeCounts['Unknown'] = (typeCounts['Unknown'] || 0) + 1; }
  });
  emails.forEach(e => {
    const t = e.triage_category || 'Unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const queryTypeData = Object.entries(typeCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Channel breakdown ───────────────────────────────────────────────────────
  const channelData = [
    { channel: 'Voice (Calls)', value: calls.length },
    { channel: 'Email', value: emails.length },
  ].filter(d => d.value > 0);

  // ── Call risk breakdown ─────────────────────────────────────────────────────
  const riskCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  calls.forEach(c => {
    if (!c.ai_analysis) return;
    try {
      const a = typeof c.ai_analysis === 'string' ? JSON.parse(c.ai_analysis) : c.ai_analysis;
      const r = a?.overall_risk;
      if (r && riskCounts[r] !== undefined) riskCounts[r]++;
    } catch {}
  });
  const riskData = Object.entries(riskCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, color: RISK_COLORS[name] }));

  // ── Call verification status ────────────────────────────────────────────────
  const verifyCounts = {};
  calls.forEach(c => {
    const s = c.verification_status || 'UNVERIFIED';
    verifyCounts[s] = (verifyCounts[s] || 0) + 1;
  });
  const verifyData = Object.entries(verifyCounts).map(([name, value]) => ({ name, value }));

  // ── Email priority breakdown ────────────────────────────────────────────────
  const emailPriorityCounts = {};
  emails.forEach(e => {
    const p = e.priority || 'NORMAL';
    emailPriorityCounts[p] = (emailPriorityCounts[p] || 0) + 1;
  });
  const emailPriorityData = Object.entries(emailPriorityCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Email triage category ───────────────────────────────────────────────────
  const emailCatCounts = {};
  emails.forEach(e => {
    const c = e.triage_category || 'Unknown';
    emailCatCounts[c] = (emailCatCounts[c] || 0) + 1;
  });
  const emailCatData = Object.entries(emailCatCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Ticket category ─────────────────────────────────────────────────────────
  const categoryCounts = tickets.reduce((acc, t) => {
    const cat = t.category || 'Unknown';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const categoryData = Object.entries(categoryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── SLA ─────────────────────────────────────────────────────────────────────
  let slaMet = 0, slaBreached = 0, slaPending = 0;
  tickets.forEach(t => {
    try {
      const meta = t.resolution_notes ? JSON.parse(t.resolution_notes) : null;
      if (meta?.sla_breached === true) slaBreached++;
      else if (meta?.sla_breached === false) slaMet++;
      else slaPending++;
    } catch { slaPending++; }
  });
  const slaData = [
    { name: 'SLA Met', value: slaMet, color: '#10b981' },
    { name: 'SLA Breached', value: slaBreached, color: '#ef4444' },
    { name: 'Pending', value: slaPending, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  // ── AI vs Human ─────────────────────────────────────────────────────────────
  const aiCount = actions.filter(a => {
    const by = (a.performed_by || '').toLowerCase();
    return by.includes('ai') || by.includes('bot') || by === '';
  }).length;
  const humanCount = actions.length - aiCount;
  const aiVsHumanData = [
    { name: 'AI Automated', value: aiCount, color: '#4F8EF7' },
    { name: 'Human Agent', value: humanCount, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  // ── Action type breakdown ────────────────────────────────────────────────────
  const actionTypeCounts = actions.reduce((acc, a) => {
    const type = (a.action_type || 'OTHER').replace(/_/g, ' ');
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const actionTypeData = Object.entries(actionTypeCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const isEmpty = (arr) => !arr || arr.length === 0;
  const emptyMsg = (msg) => <p className="text-sm text-muted-foreground text-center py-10">{msg}</p>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Live data from calls, emails, tickets and actions</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCard(<Phone className="w-6 h-6 text-[#4F8EF7]" />, 'Total Calls', calls.length, `${analyzedCalls} analyzed · ${verifiedCalls} verified`, 'bg-[#4F8EF7]/10')}
        {statCard(<Mail className="w-6 h-6 text-purple-600" />, 'Total Emails', emails.length, `${urgentEmails} urgent`, 'bg-purple-100')}
        {statCard(<TrendingUp className="w-6 h-6 text-emerald-600" />, 'Total Interactions', totalInteractions, `${tickets.length} tickets created`, 'bg-emerald-100')}
        {statCard(<Bot className="w-6 h-6 text-amber-600" />, 'Actions Logged', actions.length, `${aiCount} AI · ${humanCount} human`, 'bg-amber-100')}
      </div>

      {/* Daily activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Daily Activity — Calls & Emails (by day of week)</CardTitle>
        </CardHeader>
        <CardContent>
          {isEmpty(calls) && isEmpty(emails) ? emptyMsg('No call or email data yet') : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="calls" name="Calls" fill="#4F8EF7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="emails" name="Emails" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Query type breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Query Type (Calls + Emails)</CardTitle>
          </CardHeader>
          <CardContent>
            {isEmpty(queryTypeData) ? emptyMsg('No data yet') : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={queryTypeData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value"
                    label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                    {queryTypeData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Channel breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Channel Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isEmpty(channelData) ? emptyMsg('No data yet') : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={channelData} barSize={56}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="channel" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    <Cell fill="#4F8EF7" />
                    <Cell fill="#8b5cf6" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Call risk levels */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-base font-semibold">Call Risk Levels</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isEmpty(riskData) ? emptyMsg('No analyzed calls yet') : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={riskData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 flex-wrap">
                  {riskData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span>{d.name}: <strong>{d.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call verification status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Call Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isEmpty(verifyData) ? emptyMsg('No calls yet') : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={verifyData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {verifyData.map((d) => (
                      <Cell key={d.name} fill={d.name === 'VERIFIED' ? '#10b981' : d.name === 'REJECTED' ? '#ef4444' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Email triage categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Email Triage Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {isEmpty(emailCatData) ? emptyMsg('No emails yet') : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={emailCatData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {emailCatData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Email priority */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Email Priority Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isEmpty(emailPriorityData) ? emptyMsg('No emails yet') : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={emailPriorityData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value"
                    label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                    {emailPriorityData.map((d) => (
                      <Cell key={d.name} fill={d.name === 'URGENT' ? '#ef4444' : d.name === 'NORMAL' ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Ticket analytics */}
      <div className="pt-2">
        <h2 className="text-lg font-semibold mb-4">Ticket Analytics</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Tickets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isEmpty(categoryData) ? emptyMsg('No ticket data yet') : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={130} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {categoryData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-base font-semibold">SLA Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isEmpty(slaData) ? emptyMsg('No SLA data yet') : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={slaData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {slaData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 flex-wrap">
                  {slaData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span>{d.name}: <strong>{d.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">Actions: AI vs Human</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isEmpty(aiVsHumanData) ? emptyMsg('No action data yet') : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={aiVsHumanData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {aiVsHumanData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6">
                  {aiVsHumanData.map(d => (
                    <div key={d.name} className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: d.color + '20' }}>
                        {d.name.includes('AI') ? <Bot className="w-4 h-4" style={{ color: d.color }} /> : <User className="w-4 h-4" style={{ color: d.color }} />}
                      </div>
                      <p className="text-xl font-bold" style={{ color: d.color }}>{d.value}</p>
                      <p className="text-xs text-muted-foreground">{d.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Action Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isEmpty(actionTypeData) ? emptyMsg('No action data yet') : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={actionTypeData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={150} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      </div>

      {/* AI SOP Suggestions */}
      <div className="pt-4 border-t">
        <AISuggestionsPanel tickets={tickets} actions={actions} />
      </div>

      {/* AI Learning Log */}
      <div className="pt-4 border-t">
        <AILearningLog />
      </div>
    </div>
  );
}
