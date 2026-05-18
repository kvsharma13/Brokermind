import React from 'react';
import { Mail } from 'lucide-react';

export default function MailSortHeader() {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-8" style={{ borderColor: '#E5E7EB' }}>
      <div className="flex items-center gap-3">
        <Mail className="w-6 h-6" style={{ color: '#1A56DB' }} />
        <div>
          <h1 className="font-bold text-gray-900">MailSort AI</h1>
          <p className="text-xs text-gray-500">Intelligent Email Triage & Routing</p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className="text-xs text-gray-700">kavindra.work13@gmail.com</span>
      </div>
    </header>
  );
}
