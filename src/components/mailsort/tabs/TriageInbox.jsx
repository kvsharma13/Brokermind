import React, { useState } from 'react';
import { Download, ChevronDown, Send, Ticket } from 'lucide-react';
import { brokermind } from '@/api/brokermindClient';
import { TRIAGE_CATEGORIES } from '@/pages/MailSortAI';

const PRIORITY_COLORS = {
  URGENT: '#DC2626',
  NORMAL: '#1A56DB',
  LOW: '#6B7280',
};

export default function TriageInbox({ data, categoryConfig, onSend, onReclassify }) {
  const [expanded, setExpanded] = useState(null);
  const [ticketCreated, setTicketCreated] = useState({});

  const handleCreateTicket = async (email) => {
    await brokermind.functions.invoke('ticketAutomation', {
      event_type: 'create_email_ticket',
      email: {
        source_id: email.message_id || email.id,
        priority: email.priority,
        category: email.sub_category || email.triage_category,
        subject: email.subject,
        client_email: email.from_email,
        client_name: email.from_name || email.from_email?.split('@')[0] || '',
        raw_summary: email.ai_summary || '',
      },
    });
    setTicketCreated(prev => ({ ...prev, [email.id]: true }));
  };

  const handleExport = () => {
    const csv = ['Sender,Subject,Category,Sub-Category,Priority,Routed To'];
    data.forEach(email => {
      csv.push(`"${email.from_name || email.from_email}","${email.subject}","${email.triage_category}","${email.sub_category}","${email.priority}","${email.routed_to}"`);
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'triage_emails.csv';
    a.click();
  };

  const sorted = [...data].sort((a, b) => {
    const priorityOrder = { URGENT: 0, NORMAL: 1, LOW: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(b.received_at) - new Date(a.received_at);
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Triaged Emails <span className="text-sm font-normal text-gray-500">({data.length})</span>
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="space-y-3">
        {sorted.map(email => {
          const subConfig = categoryConfig[email.sub_category] || {};
          const mainConfig = TRIAGE_CATEGORIES[email.triage_category] || {};
          const isExpanded = expanded === email.id;
          const isPending = email.analysis_status === 'PENDING' || email.analysis_status === 'ANALYZING';

          return (
            <div
              key={email.id}
              className="bg-white rounded-lg border overflow-hidden transition hover:shadow-md"
              style={{ borderColor: '#E5E7EB', borderLeft: `4px solid ${subConfig?.color || mainConfig?.color || '#6B7280'}` }}
            >
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{email.from_name || email.from_email || 'Unknown'}</span>
                    {email.from_name && <span className="text-sm text-gray-500 ml-2">&lt;{email.from_email}&gt;</span>}
                    <p className="text-sm text-gray-500 mt-0.5">
                      {email.received_at ? new Date(email.received_at).toLocaleString() : ''}
                    </p>
                  </div>
                  {isPending && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                      ⏳ Analyzing...
                    </span>
                  )}
                </div>

                {/* Subject */}
                <p className="font-semibold text-gray-900">{email.subject}</p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {email.triage_category && mainConfig.color && (
                    <div className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: mainConfig.color }}>
                      {mainConfig.icon} {email.triage_category}
                    </div>
                  )}
                  {email.sub_category && (
                    <div className="px-3 py-1 rounded-full text-xs font-medium border"
                      style={{ color: subConfig?.color || '#6B7280', borderColor: subConfig?.color || '#E5E7EB', backgroundColor: 'transparent' }}>
                      {subConfig?.icon} {email.sub_category}
                    </div>
                  )}
                  {email.priority && (
                    <div className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: PRIORITY_COLORS[email.priority] || '#6B7280' }}>
                      {email.priority}
                    </div>
                  )}
                </div>

                {/* AI Summary */}
                {email.ai_summary && (
                  <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded border" style={{ borderColor: '#E5E7EB' }}>
                    {email.ai_summary}
                  </p>
                )}

                {/* Recommended Action */}
                {email.recommended_action && (
                  <p className="text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded border border-blue-100">
                    💡 {email.recommended_action}
                  </p>
                )}

                {/* Routing */}
                {email.routed_to && (
                  <p className="text-sm italic text-gray-500">→ Routed to: <span className="font-medium">{email.routed_to}</span></p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 flex-wrap">
                  <button
                    onClick={() => onSend(email.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium"
                  >
                    <Send className="w-4 h-4" />
                    Send to Team
                  </button>

                  <button
                    onClick={() => setExpanded(isExpanded ? null : email.id)}
                    className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-medium flex items-center gap-2"
                  >
                    <ChevronDown className={`w-4 h-4 transition ${isExpanded ? 'rotate-180' : ''}`} />
                    Full Email
                  </button>

                  <button
                    onClick={() => handleCreateTicket(email)}
                    disabled={ticketCreated[email.id]}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition text-sm font-medium disabled:opacity-50"
                  >
                    <Ticket className="w-4 h-4" />
                    {ticketCreated[email.id] ? 'Ticket Created' : 'Create Ticket'}
                  </button>

                  <div className="relative group ml-auto">
                    <button className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium">
                      Reclassify
                    </button>
                    <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-lg hidden group-hover:block z-10" style={{ borderColor: '#E5E7EB' }}>
                      {Object.keys(categoryConfig).map(cat => (
                        <button
                          key={cat}
                          onClick={() => onReclassify(email.id, cat)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expanded Body */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{email.body || '(no body)'}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}