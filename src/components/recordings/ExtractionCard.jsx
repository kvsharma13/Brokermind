import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Clock, Play } from 'lucide-react';

const TYPE_STYLES = {
  PRICE_MENTION: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  CONDITIONAL_ORDER: 'bg-orange-100 text-orange-800 border-orange-300',
  QTY_PRICE: 'bg-red-100 text-red-800 border-red-300',
  TIME_INSTRUCTION: 'bg-blue-100 text-blue-800 border-blue-300',
  PRICE_RANGE: 'bg-purple-100 text-purple-800 border-purple-300',
  NEW_ACCOUNT_DETAIL: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  QUERY_DETAIL: 'bg-sky-100 text-sky-800 border-sky-300',
  COMPLIANCE_DETAIL: 'bg-rose-100 text-rose-800 border-rose-300',
};

const URGENCY_STYLES = {
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-gray-50 text-gray-600 border-gray-200',
};

const BG_COLORS = {
  PRICE_MENTION: 'rgba(253,224,71,0.18)',
  CONDITIONAL_ORDER: 'rgba(251,146,60,0.18)',
  QTY_PRICE: 'rgba(252,165,165,0.22)',
  TIME_INSTRUCTION: 'rgba(147,197,253,0.22)',
  PRICE_RANGE: 'rgba(216,180,254,0.22)',
  NEW_ACCOUNT_DETAIL: 'rgba(52,211,153,0.15)',
  QUERY_DETAIL: 'rgba(125,211,252,0.18)',
  COMPLIANCE_DETAIL: 'rgba(251,113,133,0.18)',
};

const LEFT_BORDER_COLORS = {
  PRICE_MENTION: '#ca8a04',
  CONDITIONAL_ORDER: '#ea580c',
  QTY_PRICE: '#dc2626',
  TIME_INSTRUCTION: '#2563eb',
  PRICE_RANGE: '#7c3aed',
  NEW_ACCOUNT_DETAIL: '#059669',
  QUERY_DETAIL: '#0284c7',
  COMPLIANCE_DETAIL: '#be123c',
};

function formatTime(secs) {
  if (!secs && secs !== 0) return null;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ExtractionCard({ extraction, index, isActive, onClick, onJumpToTranscript, onSeekTo }) {
  const ts = formatTime(extraction.timestamp_estimate_seconds);
  const leftColor = LEFT_BORDER_COLORS[extraction.type] || '#888';

  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer transition-all ${isActive ? 'ring-2 ring-[#4F8EF7] shadow-md' : 'hover:shadow-sm'}`}
      style={{ background: BG_COLORS[extraction.type] || '#fff', borderLeft: `4px solid ${leftColor}` }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-xs font-semibold ${TYPE_STYLES[extraction.type] || ''}`}>
            {extraction.type?.replace(/_/g, ' ')}
          </Badge>
          {extraction.symbol && (
            <Badge variant="outline" className="text-xs bg-[#4F8EF7]/10 text-[#4F8EF7] border-[#4F8EF7]/30 font-bold">
              {extraction.symbol}
            </Badge>
          )}
        </div>
        <Badge variant="outline" className={`text-xs shrink-0 ${URGENCY_STYLES[extraction.urgency] || ''}`}>
          {extraction.urgency}
        </Badge>
      </div>

      {/* Quote */}
      <blockquote className="border-l-4 pl-3 py-1 mb-3 text-sm italic text-foreground/80" style={{ borderColor: 'currentColor' }}>
        "{extraction.quote}"
      </blockquote>

      {/* Details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
        {/* Generic field/value for NEW_ACCOUNT_DETAIL, QUERY_DETAIL, COMPLIANCE_DETAIL */}
        {extraction.field && extraction.value && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground capitalize">{extraction.field.replace(/_/g, ' ')}</p>
            <p className="text-sm font-semibold">{extraction.value}</p>
          </div>
        )}
        {/* Transactional fields */}
        {extraction.price_mentioned && (
          <div>
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="text-base font-bold text-foreground">₹{extraction.price_mentioned}</p>
          </div>
        )}
        {extraction.qty_mentioned && (
          <div>
            <p className="text-xs text-muted-foreground">Quantity</p>
            <p className="text-sm font-semibold">{extraction.qty_mentioned}</p>
          </div>
        )}
        {extraction.time_mentioned && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Time Instruction</p>
            <p className="text-sm font-medium text-blue-700">{extraction.time_mentioned}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1 h-7 text-[#4F8EF7] hover:text-[#3d7de0] px-2"
          onClick={e => { e.stopPropagation(); onJumpToTranscript(extraction.quote); }}
        >
          <ArrowUpRight className="w-3 h-3" /> Jump to transcript
        </Button>

        {ts && (
          <button
            onClick={e => { e.stopPropagation(); if (onSeekTo) onSeekTo(extraction.timestamp_estimate_seconds); }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold transition-opacity hover:opacity-80"
            style={{ background: '#1e1e3f', color: '#c7d2fe' }}
          >
            <Play className="w-2.5 h-2.5" style={{ fill: '#c7d2fe' }} />
            {ts}
          </button>
        )}
      </div>
    </div>
  );
}