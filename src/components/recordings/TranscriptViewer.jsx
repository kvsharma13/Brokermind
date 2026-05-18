import React, { useRef, useEffect, useState, useCallback } from 'react';
import AudioPlayer from './AudioPlayer';

const TYPE_COLORS = {
  PRICE_MENTION: { bg: 'rgba(253,224,71,0.55)', border: '#ca8a04', label: 'yellow' },
  CONDITIONAL_ORDER: { bg: 'rgba(251,146,60,0.45)', border: '#c2410c', label: 'orange' },
  QTY_PRICE: { bg: 'rgba(252,165,165,0.55)', border: '#dc2626', label: 'red' },
  TIME_INSTRUCTION: { bg: 'rgba(147,197,253,0.55)', border: '#2563eb', label: 'blue' },
  PRICE_RANGE: { bg: 'rgba(216,180,254,0.55)', border: '#7c3aed', label: 'purple' },
  NEW_ACCOUNT_DETAIL: { bg: 'rgba(52,211,153,0.35)', border: '#059669', label: 'emerald' },
  QUERY_DETAIL: { bg: 'rgba(125,211,252,0.4)', border: '#0284c7', label: 'sky' },
  COMPLIANCE_DETAIL: { bg: 'rgba(251,113,133,0.4)', border: '#be123c', label: 'rose' },
};

function findQuoteInTranscript(transcript, quote) {
  const q = quote.trim();
  // 1. Exact match
  const exact = transcript.indexOf(q);
  if (exact !== -1) return { start: exact, end: exact + q.length };

  // 2. Case-insensitive match
  const lower = transcript.toLowerCase();
  const qLower = q.toLowerCase();
  const ci = lower.indexOf(qLower);
  if (ci !== -1) return { start: ci, end: ci + q.length };

  // 3. First 6-8 words match (case-insensitive)
  const words = q.split(/\s+/).slice(0, 8);
  for (let len = words.length; len >= 6; len--) {
    const partial = words.slice(0, len).join(' ');
    const pi = lower.indexOf(partial.toLowerCase());
    if (pi !== -1) return { start: pi, end: pi + partial.length };
  }

  return null;
}

function buildHighlightedHTML(transcript, extractions, activeQuote) {
  if (!transcript) return '';
  if (!extractions || extractions.length === 0) {
    return transcript.replace(/\n/g, '<br/>');
  }

  const matches = [];
  extractions.forEach((ext, idx) => {
    if (!ext.quote) return;
    const found = findQuoteInTranscript(transcript, ext.quote);
    if (!found) return;
    matches.push({ start: found.start, end: found.end, ext, idx });
  });

  matches.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

  const merged = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue;
    merged.push(m);
    cursor = m.end;
  }

  let html = '';
  let pos = 0;
  for (const m of merged) {
    if (m.start > pos) {
      html += escapeHtml(transcript.slice(pos, m.start)).replace(/\n/g, '<br/>');
    }
    const colors = TYPE_COLORS[m.ext.type] || TYPE_COLORS.PRICE_MENTION;
    const isActive = activeQuote === m.ext.quote;
    html += `<mark
      data-extraction-idx="${m.idx}"
      data-quote="${escapeAttr(m.ext.quote)}"
      style="background:${colors.bg};border-bottom:2px solid ${colors.border};border-radius:3px;padding:1px 2px;cursor:pointer;${isActive ? `outline:2px solid ${colors.border};box-shadow:0 0 0 3px ${colors.bg};` : ''}"
    >${escapeHtml(transcript.slice(m.start, m.end))}</mark>`;
    pos = m.end;
  }
  if (pos < transcript.length) {
    html += escapeHtml(transcript.slice(pos)).replace(/\n/g, '<br/>');
  }
  return html;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(text) {
  return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default function TranscriptViewer({ transcript, extractions, activeQuote, onQuoteClick, recording, seekRef }) {
  const containerRef = useRef(null);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);

  const html = buildHighlightedHTML(transcript, extractions, activeQuote);

  // Wire click handlers on marks
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const marks = el.querySelectorAll('mark[data-extraction-idx]');
    marks.forEach(mark => {
      mark.onclick = () => {
        const quote = mark.getAttribute('data-quote');
        if (onQuoteClick) onQuoteClick(quote);
      };
    });
  }, [html, onQuoteClick]);

  // Scroll to active highlight
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !activeQuote) return;
    // Try exact attr match first, then partial (first mark in the container)
    let mark = el.querySelector(`mark[data-quote="${escapeAttr(activeQuote)}"]`);
    if (!mark) mark = el.querySelector('mark[data-extraction-idx]');
    if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeQuote]);

  const handleTimeUpdate = useCallback((t) => setCurrentAudioTime(t), []);

  return (
    <div className="flex flex-col h-full">
      {/* Audio player — sticky */}
      <div className="shrink-0 mb-3">
        <AudioPlayer
          recordingUrl={recording?.recording_url}
          durationSeconds={recording?.duration_seconds}
          extractions={extractions}
          seekRef={seekRef}
          onTimeUpdate={handleTimeUpdate}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-3 shrink-0">
        {Object.entries(TYPE_COLORS).map(([type, c]) => (
          <span key={type} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            {type.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* Transcript */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto text-sm leading-relaxed font-mono whitespace-pre-wrap bg-muted/30 rounded-lg border p-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}