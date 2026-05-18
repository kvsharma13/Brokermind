import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ message = "No data yet", icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Icon className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}