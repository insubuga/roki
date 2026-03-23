import './App.css'
import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import AndroidBackHandler from '@/lib/AndroidBackHandler'
import { NavigationStackProvider } from '@/lib/NavigationStack'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Lazy-load heavy pages that are not immediately needed
const Landing = React.lazy(() => import('./pages/Landing'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const Terms = React.lazy(() => import('./pages/Terms'));
const ActiveCycle = React.lazy(() => import('./pages/ActiveCycle'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const WaitlistDashboard = React.lazy(() => import('./pages/WaitlistDashboard'));

const { Pages, Layout, mainPage } = pagesConfig;

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-40">
    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const LayoutWrapper = ({ children, currentPageName }) => Layout
  ? <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <PageLoader />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Landing is public, lazily loaded */}
        <Route path="/" element={<Landing />} />
        <Route path="/Landing" element={<Landing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Auto-registered pages from pages.config.js */}
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <ProtectedRoute>
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />
        ))}

        {/* Explicit lazy routes (override pagesConfig entries with same path) */}
        <Route
          path="/Notifications"
          element={
            <ProtectedRoute>
              <LayoutWrapper currentPageName="Notifications">
                <Notifications />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ActiveCycle"
          element={
            <ProtectedRoute>
              <LayoutWrapper currentPageName="ActiveCycle">
                <ActiveCycle />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/WaitlistDashboard"
          element={
            <ProtectedRoute>
              <WaitlistDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationStackProvider>
            <NavigationTracker />
            <AndroidBackHandler />
            <AuthenticatedApp />
          </NavigationStackProvider>
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;