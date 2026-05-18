import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { brokermind } from '@/api/brokermindClient';
import { Loader2 } from 'lucide-react';
import { TRIAGE_CATEGORIES } from '@/pages/MailSortAI';
import { format, subDays, parseISO, isValid } from 'date-fns';

const PRIORITY_COLORS = { URGENT: '#DC2626', NORMAL: '#F59E0B', LOW: '#10B981' };

const CATEGORY_COLORS = {
  'Transactional': '#7C3AED',
  'Informational': '#059669',
  'New Account':   '#1A56DB',
  'Compliance':    '#DC2626',
};

export default function AnalyticsTab({ data }) {
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);

  const relevantData = data.filter(e => e.is_relevant !== false);

  // 1. Email Volume by Category
  const categoryData = Object.keys(TRIAGE_CATEGORIES).map(cat => ({
    name: cat,
    count: relevantData.filter(e => e.triage_category === cat).length,
    color: CATEGORY_COLORS[cat],
  }));

  // 2. Priority Distribution
  const priorityData = ['URGENT', 'NORMAL', 'LOW']
    .map(p => ({ name: p, count: relevantData.filter(e => e.priority === p).length }))
    .filter(d => d.count > 0);

  // 3. Top Sender Domains (top 5)
  const domainCounts = relevantData.reduce((acc, email) => {
    const domain = email.from_email?.split('@')[1] || 'unknown';
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {});
  const topDomains = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 4. Response Time Trend (verified emails: received_at → verified_at grouped by day)
  const verifiedEmails = relevantData.filter(e => e.verified_at && e.received_at);
  const rtByDay = verifiedEmails.reduce((acc, e) => {
    const day = format(parseISO(e.received_at), 'MM/dd');
    const diff = (new Date(e.verified_at) - new Date(e.received_at)) / (1000 * 60 * 60); // hours
    if (!acc[day]) acc[day] = { total: 0, count: 0 };
    acc[day].total += diff;
    acc[day].count += 1;
    return acc;
  }, {});
  const responseTrendData = Object.entries(rtByDay)
    .map(([day, { total, count }]) => ({ day, avgHours: parseFloat((total / count).toFixed(1)) }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // 5. Category Trend over last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'MM/dd'));
  const categoryTrendData = last7Days.map(day => {
    const entry = { day };
    Object.keys(TRIAGE_CATEGORIES).forEach(cat => {
      entry[cat] = relevantData.filter(e => {
        if (!e.received_at) return false;
        const d = parseISO(e.received_at);
        return isValid(d) && format(d, 'MM/dd') === day && e.triage_category === cat;
      }).length;
    });
    return entry;
  });

  // 6. LLM Operational Insight — generated on mount
  useEffect(() => {
    if (relevantData.length === 0) return;
    setInsightLoading(true);
    const counts = Object.keys(TRIAGE_CATEGORIES).map(cat => ({
      category: cat,
      count: relevantData.filter(e => e.triage_category === cat).length,
    }));
    const priorityCounts = { URGENT: 0, NORMAL: 0, LOW: 0 };
    relevantData.forEach(e => { if (e.priority) priorityCounts[e.priority] = (priorityCounts[e.priority] || 0) + 1; });

    brokermind.integrations.Core.InvokeLLM({
      prompt: `You are a senior ops analyst for a stock brokerage support team.
Based on this email triage data, write a 2-3 sentence operational insight about what the data shows and what actions the ops team should prioritize today.

Category counts: ${JSON.stringify(counts)}
Priority counts: ${JSON.stringify(priorityCounts)}
Total emails: ${relevantData.length}

Be specific and actionable. No bullet points, just plain sentences.`,
    }).then(res => {
      setInsight(typeof res === 'string' ? res : res?.text || res?.content || JSON.stringify(res));
    }).catch(() => {
      setInsight('Unable to generate insight at this time.');
    }).finally(() => setInsightLoading(false));
  }, [relevantData.length]);

  return (
    <div className="p-6 space-y-6 max-w-7xl overflow-auto">

      {/* Row 1: Category Volume + Priority + Domains */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Category Volume */}
         <div className="bg-white rounded-lg border" style={{ borderColor: '#E5E7EB', padding: '16px' }}>
           <h3 className="font-semibold text-gray-900 mb-4">Email Volume by Category</h3>
           <ResponsiveContainer width="100%" height={220}>
             <BarChart data={categoryData} margin={{ top: 5, right: 16, left: 0, bottom: 40 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {categoryData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Priority Distribution */}
         <div className="bg-white rounded-lg border" style={{ borderColor: '#E5E7EB', padding: '16px' }}>
           <h3 className="font-semibold text-gray-900 mb-4">Priority Distribution</h3>
           {priorityData.length === 0 ? (
             <p className="text-sm text-gray-400 text-center pt-16">No data yet</p>
           ) : (
             <ResponsiveContainer width="100%" height={220}>
               <PieChart margin={{ top: 0, right: 8, left: 8, bottom: 20 }}>
                 <Pie data={priorityData} cx="50%" cy="38%" outerRadius={60} dataKey="count">
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [v, name]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 0 }} layout="horizontal" verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 3: Top Sender Domains */}
         <div className="bg-white rounded-lg border" style={{ borderColor: '#E5E7EB', padding: '16px' }}>
           <h3 className="font-semibold text-gray-900 mb-4">Top Sender Domains</h3>
           {topDomains.length === 0 ? (
             <p className="text-sm text-gray-400 text-center pt-16">No data yet</p>
           ) : (
             <ResponsiveContainer width="100%" height={220}>
               <BarChart
                 layout="vertical"
                 data={topDomains}
                 margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
               >
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                 <XAxis type="number" allowDecimals={false} />
                 <YAxis type="category" dataKey="domain" width={120} tick={{ fontSize: 12 }} />
                 <Tooltip />
                 <Bar dataKey="count" fill="#7C3AED" radius={[0, 4, 4, 0]} barSize={24} />
               </BarChart>
             </ResponsiveContainer>
           )}
         </div>
      </div>

      {/* Row 2: Response Time Trend + Category Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 4: Response Time Trend */}
         <div className="bg-white rounded-lg border" style={{ borderColor: '#E5E7EB', padding: '16px' }}>
           <h3 className="font-semibold text-gray-900 mb-4">Response Time Trend (avg hours to verify)</h3>
           {responseTrendData.length === 0 ? (
             <div className="flex items-center justify-center h-40 text-sm text-gray-400">No verified emails yet</div>
           ) : (
             <ResponsiveContainer width="100%" height={220}>
               <LineChart data={responseTrendData} margin={{ top: 5, right: 16, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="h" width={40} />
                <Tooltip formatter={(v) => `${v}h`} />
                <Line type="monotone" dataKey="avgHours" stroke="#1A56DB" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 5: Category Trend (last 7 days) */}
         <div className="bg-white rounded-lg border" style={{ borderColor: '#E5E7EB', padding: '16px' }}>
           <h3 className="font-semibold text-gray-900 mb-4">Category Trend — Last 7 Days</h3>
           <ResponsiveContainer width="100%" height={220}>
             <LineChart data={categoryTrendData} margin={{ top: 5, right: 16, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              {Object.keys(TRIAGE_CATEGORIES).map(cat => (
                <Line key={cat} type="monotone" dataKey={cat} stroke={CATEGORY_COLORS[cat]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operational Insight */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg" style={{ padding: '16px' }}>
        <h3 className="font-semibold text-blue-900 mb-2">📊 Operational Insight</h3>
        {insightLoading ? (
          <div className="flex items-center gap-2 text-blue-700 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating insight...
          </div>
        ) : (
          <p className="text-blue-800 text-sm leading-relaxed">{insight || 'Fetch emails to generate insights.'}</p>
        )}
      </div>
    </div>
  );
}