import React from 'react';
import { brokermind } from '@/api/brokermindClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  APPROVED: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'Approved — learning to suggest more' },
  REJECTED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', label: 'Rejected — learning to suggest less' },
};

const CATEGORY_COLORS = {
  Transactional: 'bg-blue-100 text-blue-700',
  Compliance: 'bg-red-100 text-red-700',
  Informational: 'bg-emerald-100 text-emerald-700',
  'New Account': 'bg-purple-100 text-purple-700',
  'Fund Transfer': 'bg-amber-100 text-amber-700',
};

export default function AILearningLog() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['ai-sop-log'],
    queryFn: () => brokermind.entities.AISOPSuggestion.list('-created_date', 50),
  });

  const approved = logs.filter(l => l.status === 'APPROVED').length;
  const rejected = logs.filter(l => l.status === 'REJECTED').length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" /> AI Learning Log
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Based on your approvals and rejections, the AI continuously refines its future SOP suggestions
        </p>
      </div>

      {/* Learning stats */}
      {logs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Reviewed</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{approved}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Approved SOPs</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{rejected}</p>
              <p className="text-xs text-red-500 mt-0.5">Rejected SOPs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Learning quality indicator */}
      {logs.length >= 3 && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-purple-800">Learning in progress</p>
              <p className="text-xs text-purple-600 mt-0.5">
                Based on {logs.length} reviewed suggestions ({approved} approved, {rejected} rejected),
                the AI will weight future suggestions toward {approved > rejected ? 'similar approved patterns' : 'alternative approaches'}
                with higher accuracy.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Loading...</CardContent>
        </Card>
      )}

      {!isLoading && logs.length === 0 && (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No reviewed suggestions yet. Approve or reject AI suggestions above to start building the learning log.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {logs.map(log => {
          const config = STATUS_CONFIG[log.status];
          if (!config) return null;
          const Icon = config.icon;
          const steps = (() => { try { return JSON.parse(log.steps); } catch { return []; } })();
          const impact = (() => { try { return JSON.parse(log.estimated_impact || '{}'); } catch { return {}; } })();
          const impactEntries = Object.entries(impact);
          const catColor = CATEGORY_COLORS[log.category] || 'bg-gray-100 text-gray-700';

          return (
            <Card key={log.id} className={`border ${config.bg}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catColor}`}>{log.category}</span>
                      <span className="text-xs font-semibold">{log.title}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {log.created_date ? format(new Date(log.created_date), 'MMM d, HH:mm') : ''}
                      </span>
                    </div>
                    <p className={`text-xs font-medium ${config.color}`}>{config.label}</p>
                    {log.confidence_score && (
                      <p className="text-xs text-muted-foreground mt-0.5">AI confidence was {log.confidence_score}%</p>
                    )}
                    {impactEntries.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        {impactEntries.map(([k, v]) => (
                          <span key={k} className="text-xs text-muted-foreground">
                            <span className="font-medium">{k.replace(/_/g, ' ')}:</span> {v}
                          </span>
                        ))}
                      </div>
                    )}
                    {steps.length > 0 && log.status === 'APPROVED' && (
                      <p className="text-xs text-muted-foreground mt-1">{steps.length} SOP steps approved for active use</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}