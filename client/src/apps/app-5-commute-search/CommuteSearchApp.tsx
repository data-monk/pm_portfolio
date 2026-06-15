import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getClientConfig } from './lib/clientConfig';
import './commuteSearch.css';

const SearchPage = lazy(() => import('./pages/SearchPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const ListingDetailPage = lazy(() => import('./pages/ListingDetailPage'));
const SavedListingsPage = lazy(() => import('./pages/SavedListingsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const AppLoading: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-slate-400 text-sm animate-pulse">Loading…</div>
  </div>
);

const CommuteSearchApp: React.FC = () => {
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    getClientConfig().then(() => setConfigReady(true));
  }, []);

  if (!configReady) return <AppLoading />;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="cs-app">
        <Suspense fallback={<AppLoading />}>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/listing/:id" element={<ListingDetailPage />} />
            <Route path="/saved" element={<SavedListingsPage />} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </Suspense>
      </div>
    </QueryClientProvider>
  );
};

export default CommuteSearchApp;
