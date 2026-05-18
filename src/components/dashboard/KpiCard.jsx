import React from 'react';
import { Card } from '@/components/ui/card';

export default function KpiCard({ title, value, subtitle, icon: Icon, color = '#4F8EF7' }) {
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 -mr-4 -mt-4 rounded-full opacity-10" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold mt-1.5" style={{ color }}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </Card>
  );
}