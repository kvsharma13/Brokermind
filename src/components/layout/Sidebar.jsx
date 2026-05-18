import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, MessageSquare, Users, HelpCircle, BarChart3, Cpu, X, Mic, Mail, ClipboardList, HeadphonesIcon, Ticket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { brokermind } from '@/api/brokermindClient';
import { useQuery } from '@tanstack/react-query';

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/escalations', label: 'Escalation Queue', icon: AlertTriangle, showBadge: 'escalations' },
  { path: '/verifications', label: 'Call Verifications', icon: Mic, showBadge: 'recordings' },
  { path: '/performed-actions', label: 'Performed Actions', icon: ClipboardList },
  { path: '/clients', label: 'Client Simulator', icon: Users },
  { path: '/faq', label: 'Knowledge Base', icon: HelpCircle },
  { path: '/mailsort', label: 'MailSort AI', icon: Mail },
  { path: '/tickets', label: 'Ticket Tracker', icon: Ticket },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/support', label: 'Support Form', icon: HeadphonesIcon },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  const { data: escalations = [] } = useQuery({
    queryKey: ['open-escalations-count'],
    queryFn: () => brokermind.entities.Escalation.filter({ status: 'OPEN' }),
    refetchInterval: 30000,
  });

  const { data: recordings = [] } = useQuery({
    queryKey: ['unverified-actionable-count'],
    queryFn: () => brokermind.entities.CallRecording.filter({ verification_status: 'UNVERIFIED' }),
    refetchInterval: 30000,
  });

  const openCount = escalations.length;

  const highRiskUnverified = recordings.filter(r => {
    if (!r.ai_analysis) return false;
    try {
      const a = typeof r.ai_analysis === 'string' ? JSON.parse(r.ai_analysis) : r.ai_analysis;
      return a.has_actionable_order === true;
    } catch { return false; }
  }).length;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-[#0F1B35] text-white
        flex flex-col transition-transform duration-300
        lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4F8EF7] flex items-center justify-center">
              <Cpu className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">BrokerMind</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-[#4F8EF7] text-white shadow-lg shadow-[#4F8EF7]/25'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.showBadge === 'escalations' && openCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 min-w-[20px] flex items-center justify-center hover:bg-red-500">
                    {openCount}
                  </Badge>
                )}
                {item.showBadge === 'recordings' && highRiskUnverified > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-xs text-white/30">BrokerMind AI Platform</p>
          <p className="text-xs text-white/20 mt-0.5">POC v1.0</p>
        </div>
      </aside>
    </>
  );
}