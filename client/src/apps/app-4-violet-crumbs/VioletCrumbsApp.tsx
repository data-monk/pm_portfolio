import './violet-crumbs.css';
import { Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@vc/components/ui/tooltip';
import { Toaster } from '@vc/components/ui/toaster';
import { Toaster as Sonner } from '@vc/components/ui/sonner';

import LandingPage from '@vc/pages/LandingPage';
import FeedPage from '@vc/pages/FeedPage';
import FoodDetailPage from '@vc/pages/FoodDetailPage';
import PostFoodPage from '@vc/pages/PostFoodPage';
import NotificationsPage from '@vc/pages/NotificationsPage';
import ProfilePage from '@vc/pages/ProfilePage';
import CampusImpactPage from '@vc/pages/CampusImpactPage';
import NotFound from '@vc/pages/NotFound';
import { VC_BASE } from '@vc/lib/navigation';

const queryClient = new QueryClient();

// Renders violet-crumbs as nested routes under /apps/violet-crumbs/*
// The parent route in App.jsx should be:  <Route path="/apps/violet-crumbs/*" element={<VioletCrumbsApp />} />
const VioletCrumbsApp = () => (
  <div className="vc-app min-h-screen">
    {/* Floating back-to-portfolio chip */}
    <Link
      to="/"
      className="fixed top-3 left-3 z-[100] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-80"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
      </svg>
      Portfolio
    </Link>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route index element={<LandingPage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="food/:id" element={<FoodDetailPage />} />
          <Route path="post" element={<PostFoodPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="impact" element={<CampusImpactPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  </div>
);

export default VioletCrumbsApp;
