import React, { useState } from 'react';
import { TRIAGE_CATEGORIES } from '@/pages/MailSortAI';

const PRIORITY_COLORS = {
  URGENT: '#DC2626',
  NORMAL: '#1A56DB',
  LOW: '#6B7280',
};

export default function CategoryView({ data, onReclassify }) {
  const [expanded, setExpanded] = useState({});

  const toggleCard = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // Group by triage_category, only relevant emails
  const grouped = Object.keys(TRIAGE_CATEGORIES).reduce((acc, cat) => {
    acc[cat] = data.filter(e => e.triage_category === cat && e.is_relevant !== false);
    return acc;
  }, {});

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Object.entries(TRIAGE_CATEGORIES).map(([cat, config]) => {
          const emails = grouped[cat] || [];

          return (
            <div key={cat} className="flex flex-col rounded-xl overflow-hidden bg-white border shadow-sm" style={{ borderColor: '#E5E7EB' }}>
              {/* Column Header */}
              <div className="p-4 text-white" style={{ backgroundColor: config.color }}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{config.icon} {cat}</h3>
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {emails.length}
                  </span>
                </div>
              </div>

              {/* Email List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {emails.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No emails</p>
                ) : (
                  emails.map(email => {
                    const isExpanded = !!expanded[email.id];
                    return (
                      <div
                        key={email.id}
                        onClick={() => toggleCard(email.id)}
                        className="p-3 cursor-pointer hover:bg-gray-50 transition space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {email.from_name || email.from_email?.split('@')[0] || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{email.subject}</p>
                          </div>
                          <span
                            className="shrink-0 px-1.5 py-0.5 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: PRIORITY_COLORS[email.priority] || '#6B7280' }}
                          >
                            {email.priority}
                          </span>
                        </div>

                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                            <p><span className="font-medium">From:</span> {email.from_email}</p>
                            {email.sub_category && <p><span className="font-medium">Sub-category:</span> {email.sub_category}</p>}
                            {email.routed_to && <p><span className="font-medium">Routed to:</span> {email.routed_to}</p>}
                            {email.ai_summary && <p className="mt-1 text-gray-700 italic">"{email.ai_summary}"</p>}
                            <div className="relative group mt-2" onClick={e => e.stopPropagation()}>
                              <button className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 transition">
                                Reclassify
                              </button>
                              <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg hidden group-hover:block z-10 min-w-max" style={{ borderColor: '#E5E7EB' }}>
                                {Object.keys(TRIAGE_CATEGORIES).map(c => (
                                  <button
                                    key={c}
                                    onClick={() => onReclassify(email.id, c)}
                                    className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                                  >
                                    {c}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}