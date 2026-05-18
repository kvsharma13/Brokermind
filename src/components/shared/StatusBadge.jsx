import React from 'react';
import { Badge } from '@/components/ui/badge';

const statusStyles = {
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ESCALATED: 'bg-red-50 text-red-700 border-red-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  OPEN: 'bg-amber-50 text-amber-700 border-amber-200',
  EXECUTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-gray-50 text-gray-500 border-gray-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const bucketStyles = {
  A: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  B: 'bg-amber-50 text-amber-700 border-amber-200',
  C: 'bg-red-50 text-red-700 border-red-200',
};

export function StatusBadge({ status }) {
  return (
    <Badge variant="outline" className={`text-xs font-medium ${statusStyles[status] || 'bg-gray-50 text-gray-500'}`}>
      {status}
    </Badge>
  );
}

export function BucketBadge({ bucket }) {
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${bucketStyles[bucket] || ''}`}>
      Bucket {bucket}
    </Badge>
  );
}

export function ChannelIcon({ channel }) {
  const icons = {
    VOICE: '📞',
    WHATSAPP: '💬',
    WEBCHAT: '🖥️',
  };
  return <span className="text-base" title={channel}>{icons[channel] || '📞'}</span>;
}