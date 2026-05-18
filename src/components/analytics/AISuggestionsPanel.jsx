import React, { useState } from 'react';
import { brokermind } from '@/api/brokermindClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, ChevronDown, ChevronUp, CheckCircle2, XCircle, TrendingUp, AlertTriangle } from 'lucide-react';

const CATEGORY_COLORS = {
  Transactional: 'bg-blue-100 text-blue-800 border-blue-200',
  Compliance: 'bg-red-100 text-red-800 border-red-200',
  Informational: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'New Account': 'bg-purple-100 text-purple-800 border-purple-200',
  'Fund Transfer': 'bg-amber-100 text-amber-800 border-amber-200',
};

function ConfidenceBadge({ score }) {
  const color = score >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : score >= 60 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-700 bg-red-50 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {score}% confidence
    </span>
  );
}

function SuggestionCard({ suggestion, onApprove, onReject, isActing }) {
  const [expanded, setExpanded] = useState(false);
  const catColor = CATEGORY_COLORS[suggestion.category] || 'bg-gray-100 text-gray-700 border-gray-200';
  const impactEntries = suggestion.estimated_impact ? Object.entries(suggestion.estimated_impact) : [];

  return (
    <Card className="border-l-4 border-l-primary/60">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="outline" className={`text-xs ${catColor}`}>{suggestion.category}</Badge>
              <ConfidenceBadge score={suggestion.confidence_score || 0} />
            </div>
            <h3 className="font-semibold text-sm">{suggestion.title}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              onClick={() => onApprove(suggestion)} disabled={isActing}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => onReject(suggestion)} disabled={isActing}>
              <XCircle className="w-3.5 h-3.5" /> Reject
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4 space-y-3">
        {/* Reasoning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Why this is suggested
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">{suggestion.reasoning}</p>
        </div>

        {/* Estimated impact */}
        {impactEntries.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-emerald-800 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" /> Estimated Impact
            </p>
            <div className="space-y-1">
              {impactEntries.map(([key, val]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <span className="text-emerald-600 font-medium shrink-0">{key.replace(/_/g, ' ')}:</span>
                  <span className="text-emerald-700">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps - collapsible */}
        <div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Hide' : 'View'} SOP Steps ({Array.isArray(suggestion.steps) ? suggestion.steps.length : 0})
          </button>
          {expanded && (
            <ol className="mt-2 space-y-1.5 pl-1">
              {(Array.isArray(suggestion.steps) ? suggestion.steps : []).map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="text-muted-foreground leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AISuggestionsPanel({ tickets, actions }) {
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await brokermind.functions.invoke('generateSOPSuggestions', { tickets, actions });
      setSuggestions(res?.suggestions || []);
      setGenerated(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: ({ suggestion, status }) => brokermind.entities.AISOPSuggestion.create({
      category: suggestion.category,
      title: suggestion.title,
      steps: JSON.stringify(suggestion.steps),
      reasoning: suggestion.reasoning,
      estimated_impact: JSON.stringify(suggestion.estimated_impact || {}),
      confidence_score: suggestion.confidence_score,
      status,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-sop-log'] });
    },
  });

  const handleApprove = async (suggestion) => {
    await saveMutation.mutateAsync({ suggestion, status: 'APPROVED' });
    setSuggestions(s => s.filter(x => x.title !== suggestion.title));
  };

  const handleReject = async (suggestion) => {
    await saveMutation.mutateAsync({ suggestion, status: 'REJECTED' });
    setSuggestions(s => s.filter(x => x.title !== suggestion.title));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" /> AI SOP Suggestions
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI analyzes current metrics and suggests improved standard operating procedures for each query type
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
          <Sparkles className="w-4 h-4" />
          {isGenerating ? 'Analyzing...' : generated ? 'Regenerate Suggestions' : 'Generate AI Suggestions'}
        </Button>
      </div>

      {isGenerating && (
        <Card className="border-dashed">
          <CardContent className="py-10 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">AI is analyzing your metrics and generating SOPs...</p>
          </CardContent>
        </Card>
      )}

      {!isGenerating && generated && suggestions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            All suggestions have been reviewed. Regenerate to get fresh ones.
          </CardContent>
        </Card>
      )}

      {!isGenerating && suggestions.map((s, i) => (
        <SuggestionCard
          key={i}
          suggestion={s}
          onApprove={handleApprove}
          onReject={handleReject}
          isActing={saveMutation.isPending}
        />
      ))}

      {!generated && !isGenerating && (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="py-8 flex flex-col items-center gap-2 text-center">
            <Sparkles className="w-6 h-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click "Generate AI Suggestions" to get data-driven SOP recommendations based on your current metrics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}