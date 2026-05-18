import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout';
import Overview from './pages/Overview';
import EscalationQueue from './pages/EscalationQueue';
import ClientSimulator from './pages/ClientSimulator';
import FaqPage from './pages/FaqPage';
import Analytics from './pages/Analytics';
import CallVerifications from './pages/CallVerifications';
import PerformedActions from './pages/PerformedActions';
import MailSortAI from './pages/MailSortAI';
import Support from './pages/Support';
import TicketTracker from './pages/TicketTracker';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#4F8EF7]/20 border-t-[#4F8EF7] rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading BrokerMind...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/escalations" element={<EscalationQueue />} />
        <Route path="/verifications" element={<CallVerifications />} />
        <Route path="/performed-actions" element={<PerformedActions />} />
        <Route path="/clients" element={<ClientSimulator />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/mailsort" element={<MailSortAI />} />
        <Route path="/support" element={<Support />} />
        <Route path="/tickets" element={<TicketTracker />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App