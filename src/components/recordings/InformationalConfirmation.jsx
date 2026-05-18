import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function InformationalConfirmation({ summary }) {
  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
      <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
        <CheckCircle2 className="w-4 h-4" />
        Query marked as resolved by AI
      </div>
      {summary && (
        <p className="text-sm text-emerald-700 leading-relaxed">{summary}</p>
      )}
    </div>
  );
}