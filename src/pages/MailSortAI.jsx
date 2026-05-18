import React, { useState, useCallback, useEffect } from 'react';
import { Mail, LogOut, Loader2 } from 'lucide-react';
import { brokermind } from '@/api/brokermindClient';
import { useQuery } from '@tanstack/react-query';
import MailSortHeader from '@/components/mailsort/MailSortHeader';
import MailSortSidebar from '@/components/mailsort/MailSortSidebar';
import TriageInbox from '@/components/mailsort/tabs/TriageInbox';
import CategoryView from '@/components/mailsort/tabs/CategoryView';
import AnalyticsTab from '@/components/mailsort/tabs/AnalyticsTab';
import { useToast } from '@/components/ui/use-toast';

export const TRIAGE_CATEGORIES = {
  'Transactional': { color: '#7C3AED', icon: '💸', subcategories: ['Fund Transfer'] },
  'New Account':   { color: '#1A56DB', icon: '📋', subcategories: ['Account Opening'] },
  'Compliance':    { color: '#DC2626', icon: '⚖️',  subcategories: ['Compliance'] },
  'Informational': { color: '#059669', icon: '💬', subcategories: ['Platform Support', 'General Enquiry'] },
};

export const SUBCATEGORY_CONFIG = {
  'Fund Transfer':    { color: '#7C3AED', icon: '💰', routed_to: 'operations@brokerage.com' },
  'Account Opening':  { color: '#1A56DB', icon: '📋', routed_to: 'onboarding@brokerage.com' },
  'Platform Support': { color: '#D97706', icon: '🛠️', routed_to: 'support@brokerage.com' },
  'Compliance':       { color: '#DC2626', icon: '⚖️', routed_to: 'compliance@brokerage.com' },
  'General Enquiry':  { color: '#059669', icon: '💬', routed_to: 'info@brokerage.com' },
};

// Keep CATEGORY_CONFIG as alias for backward compat (CategoryView, etc.)
const CATEGORY_CONFIG = SUBCATEGORY_CONFIG;

export default function MailSortAI() {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [emailsFetched, setEmailsFetched] = useState(true);

  // Check Gmail connection status on mount + handle OAuth callback params
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected')) {
      window.history.replaceState({}, '', window.location.pathname);
      brokermind.functions.invoke('fetchGmailEmails', { check_connection: true })
        .then(res => {
          const email = res?.connected_email || '';
          setUserEmail(email);
          setConnected(true);
          toast({ title: 'Gmail Connected', description: `Connected as ${email}` });
        }).catch(() => {});
    }
    if (params.get('gmail_error')) {
      window.history.replaceState({}, '', window.location.pathname);
      toast({ title: 'Gmail Connection Failed', description: params.get('gmail_error'), variant: 'destructive' });
    }
    // Check existing connection on page load
    brokermind.functions.invoke('fetchGmailEmails', { check_connection: true })
      .then(res => {
        if (res?.connected_email) {
          setUserEmail(res.connected_email);
          setConnected(true);
        }
      }).catch(() => {});
  }, []);


  // Read emails from Email entity (source of truth)
  const { data: triageData = [], refetch: refetchEmails } = useQuery({
    queryKey: ['emails'],
    queryFn: async () => {
      const all = await brokermind.entities.Email.list('-received_at', 100);
      return all.filter(e => e.is_relevant !== false);
    },
    enabled: true,
    refetchInterval: loading ? 3000 : false,
  });
  const [activeTab, setActiveTab] = useState('inbox');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const handleFetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await brokermind.functions.invoke('fetchGmailEmails', {});
      const fetched = res?.emails || [];
      setEmails(fetched);
      setEmailsFetched(true);
      await refetchEmails();
      toast({ title: 'Emails Checked', description: `${fetched.length} emails fetched and being analyzed`, duration: 3000 });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to fetch emails', variant: 'destructive', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleRunTriage = useCallback(async () => {
    setLoading(true);
    try {
      setEmailsFetched(true);
      await refetchEmails();
      toast({ title: 'Refreshed', description: `Loaded ${triageData.length} emails from database`, duration: 3000 });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load emails', variant: 'destructive', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [refetchEmails, triageData.length, toast]);

  const handleSendEmail = useCallback((emailId) => {
    const email = triageData.find(e => e.id === emailId);
    if (!email) return;
    const senderName = email.from_name || email.from_email || 'Unknown';
    toast({
      title: '✓ Email Forwarded',
      description: `Email from ${senderName} forwarded to ${email.routed_to}`,
      duration: 3000
    });
  }, [triageData, toast]);

  const handleReclassify = useCallback(async (emailId, newSubCategory) => {
    const config = CATEGORY_CONFIG[newSubCategory];
    await brokermind.entities.Email.update(emailId, {
      sub_category: newSubCategory,
      routed_to: config?.routed_to || '',
    });
    refetchEmails();
  }, [refetchEmails]);

  const handleConnect = useCallback(() => {
    // Redirect to backend OAuth flow
    window.location.href = '/api/auth/gmail/connect';
  }, []);

  const handleDisconnect = useCallback(async () => {
    await fetch('/api/auth/gmail/disconnect').catch(() => {});
    setConnected(false);
    setUserEmail('');
    setEmails([]);
    toast({ title: 'Disconnected', description: 'Gmail account disconnected', duration: 2000 });
  }, [toast]);

  const filteredData = triageData.filter(email => {
    const mainCats = Object.keys(TRIAGE_CATEGORIES);
    const categoryMatch =
      filterCategory === 'All' ||
      (mainCats.includes(filterCategory) ? email.triage_category === filterCategory : email.sub_category === filterCategory);
    const priorityMatch = filterPriority === 'All' || email.priority === filterPriority;
    const searchMatch = !searchQuery ||
      (email.from_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (email.from_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (email.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && priorityMatch && searchMatch;
  });

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#F5F7FA' }}>
      <MailSortHeader 
        connected={connected}
        userEmail={userEmail}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <MailSortSidebar
          connected={connected}
          triageData={triageData}
          loading={loading}
          filterCategory={filterCategory}
          filterPriority={filterPriority}
          searchQuery={searchQuery}
          onFetchEmails={handleFetchEmails}
          onRunTriage={handleRunTriage}
          onFilterCategoryChange={setFilterCategory}
          onFilterPriorityChange={setFilterPriority}
          onSearchChange={setSearchQuery}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {triageData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Mail className="w-16 h-16 mx-auto text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-800">No Emails Yet</h2>
                <p className="text-gray-600">Fetch and triage emails to get started</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex gap-2 px-6 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
                {['inbox', 'kanban', 'analytics'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 font-medium transition ${
                      activeTab === tab
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab === 'inbox' && 'Triage Inbox'}
                    {tab === 'kanban' && 'Category View'}
                    {tab === 'analytics' && 'Analytics'}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-auto">
                {activeTab === 'inbox' && (
                  <TriageInbox
                    data={filteredData}
                    categoryConfig={CATEGORY_CONFIG}
                    onSend={handleSendEmail}
                    onReclassify={handleReclassify}
                  />
                )}
                {activeTab === 'kanban' && (
                  <CategoryView
                    data={filteredData}
                    categoryConfig={CATEGORY_CONFIG}
                    onReclassify={handleReclassify}
                  />
                )}
                {activeTab === 'analytics' && (
                  <AnalyticsTab
                    data={triageData}
                    categoryConfig={CATEGORY_CONFIG}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg px-8 py-6 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-gray-700 font-medium">MailSort AI is analyzing emails...</p>
          </div>
        </div>
      )}
    </div>
  );
}