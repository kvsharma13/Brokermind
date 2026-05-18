import React, { createContext, useContext } from 'react';

// Auth is intentionally skipped — the backend exposes an open API for now.
// This stub keeps the existing useAuth()/AuthProvider surface so consumers
// (App.jsx, ProtectedRoute.jsx) continue to render without modification.
const AuthContext = createContext(null);

const STUB_USER = {
  id: 'local-dev-user',
  email: 'dev@brokermind.local',
  full_name: 'Local Dev',
  role: 'admin',
};

const STUB_VALUE = {
  user: STUB_USER,
  isAuthenticated: true,
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  appPublicSettings: null,
  authChecked: true,
  logout: () => {},
  navigateToLogin: () => {},
  checkUserAuth: async () => STUB_USER,
  checkAppState: async () => {},
};

export const AuthProvider = ({ children }) => (
  <AuthContext.Provider value={STUB_VALUE}>{children}</AuthContext.Provider>
);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  return ctx || STUB_VALUE;
};
