import React from 'react';
import { Mail, LogOut, Plug } from 'lucide-react';

export default function MailSortHeader({ connected, userEmail, onConnect, onDisconnect }) {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-8" style={{ borderColor: '#E5E7EB' }}>
      <div className="flex items-center gap-3">
        <Mail className="w-6 h-6" style={{ color: '#1A56DB' }} />
        <div>
          <h1 className="font-bold text-gray-900">MailSort AI</h1>
          <p className="text-xs text-gray-500">Intelligent Email Triage & Routing</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {connected && userEmail ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-700">{userEmail}</span>
            </div>
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition"
              title="Disconnect Gmail"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition"
            style={{ backgroundColor: '#1A56DB' }}
          >
            <Plug className="w-4 h-4" />
            Connect Gmail
          </button>
        )}
      </div>
    </header>
  );
}