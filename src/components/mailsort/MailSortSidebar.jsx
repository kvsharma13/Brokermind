import React, { useState } from 'react';
import { Mail, Filter, Search, Loader2, ChevronDown } from 'lucide-react';
import { TRIAGE_CATEGORIES } from '@/pages/MailSortAI';

const PRIORITIES = ['All', 'URGENT', 'NORMAL', 'LOW'];

export default function MailSortSidebar({
  triageData,
  loading,
  filterCategory,
  filterPriority,
  searchQuery,
  onFetchEmails,
  onRunTriage,
  onFilterCategoryChange,
  onFilterPriorityChange,
  onSearchChange,
}) {
  const [expandedMain, setExpandedMain] = useState(Object.keys(TRIAGE_CATEGORIES));

  const toggleMain = (cat) => {
    setExpandedMain(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const mainCounts = {};
  const subCounts = {};
  triageData.forEach(e => {
    if (e.triage_category) mainCounts[e.triage_category] = (mainCounts[e.triage_category] || 0) + 1;
    if (e.sub_category) subCounts[e.sub_category] = (subCounts[e.sub_category] || 0) + 1;
  });

  return (
    <div className="w-72 bg-white border-r flex flex-col overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
      {/* Actions */}
      <div className="p-5 border-b space-y-2.5" style={{ borderColor: '#E5E7EB' }}>
        <button
          onClick={onFetchEmails}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Check Mail
        </button>
        <button
          onClick={onRunTriage}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '✨'}
          Run Triage
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search */}
        <div className="p-4 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search sender or subject..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="p-4 border-b" style={{ borderColor: '#E5E7EB' }}>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
            <Filter className="w-3 h-3" /> Category
          </p>

          {/* All */}
          <button
            onClick={() => onFilterCategoryChange('All')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition mb-1 flex justify-between items-center ${
              filterCategory === 'All' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>All</span>
            {triageData.length > 0 && <span className="text-xs font-bold">{triageData.length}</span>}
          </button>

          {/* Main categories collapsible */}
          {Object.entries(TRIAGE_CATEGORIES).map(([main, config]) => {
            const isOpen = expandedMain.includes(main);
            const mainCount = mainCounts[main] || 0;
            const isMainActive = filterCategory === main;

            return (
              <div key={main} className="mb-1">
                <div className="flex items-center">
                  <button
                    onClick={() => onFilterCategoryChange(main)}
                    className={`flex-1 text-left px-3 py-2 rounded-l-lg text-sm transition flex items-center gap-2 ${
                      isMainActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-800 font-medium hover:bg-gray-50'
                    }`}
                  >
                    <span>{config.icon}</span>
                    <span className="flex-1">{main}</span>
                    {mainCount > 0 && (
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: config.color }}
                      >
                        {mainCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => toggleMain(main)}
                    className="px-2 py-2 rounded-r-lg text-gray-400 hover:bg-gray-50 transition"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {config.subcategories.map(sub => {
                      const subCount = subCounts[sub] || 0;
                      const isSubActive = filterCategory === sub;
                      return (
                        <button
                          key={sub}
                          onClick={() => onFilterCategoryChange(sub)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition flex justify-between items-center ${
                            isSubActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span>↳ {sub}</span>
                          {subCount > 0 && <span className="font-semibold">{subCount}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Priority filter */}
        <div className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Priority</p>
          <div className="space-y-1">
            {PRIORITIES.map(pri => (
              <button
                key={pri}
                onClick={() => onFilterPriorityChange(pri)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  filterPriority === pri ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {pri}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}