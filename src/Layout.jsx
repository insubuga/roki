import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from './utils';

import PageTransition from './components/mobile/PageTransition';
import PullToRefresh from './components/mobile/PullToRefresh';
import ErrorBoundary from './components/error/ErrorBoundary';
import NotificationDropdown from './components/notifications/NotificationDropdown';
import FloatingAssistant from './components/assistant/FloatingAssistant';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { LogOut, User, Home, Activity, Zap, Shield, Settings } from 'lucide-react';

// ─── Bottom Nav items ────────────────────────────────────────────────────────
const BOTTOM_NAV = [
  { name: 'Home',     page: 'Dashboard',     icon: Home },
  { name: 'Cycle',    page: 'ActiveCycle',   icon: Activity },
  { name: 'Network',  page: 'Network',       icon: Zap },
  { name: 'Risk',     page: 'RiskRecovery',  icon: Shield },
  { name: 'Settings', page: 'Configuration', icon: Settings },
];

// ─── Desktop Nav items ───────────────────────────────────────────────────────
const DESKTOP_NAV_BASE = [
  { name: 'Control Center', page: 'Dashboard' },
  { name: 'Active Cycle',   page: 'ActiveCycle' },
  { name: 'Network',        page: 'Network' },
  { name: 'Risk & Recovery',page: 'RiskRecovery' },
  { name: 'Performance',    page: 'Performance' },
  { name: 'Configuration',  page: 'Configuration' },
];

const ADMIN_NAV = [
  { name: 'Operations', page: 'OperationsView' },
  { name: 'Ops Intel',  page: 'AdminOps' },
];

const DRIVER_NAV = [{ name: 'Driver', page: 'DriverDashboard' }];

function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser]           = useState(null);
  const [pendingTab, setPendingTab] = useState(null);
  // Mobile header auto-hide
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const headerHideTimer = useRef(null);

  // Per-tab history stacks for restoring last position
  const tabHistoryRef = useRef({});

  // ── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // ── Active cycle badge ───────────────────────────────────────────────────
  const { data: hasActiveCycle } = useQuery({
    queryKey: ['hasActiveCycle', user?.email],
    queryFn: async () => {
      const cycles = await base44.entities.Cycle.filter({
        user_email: user.email,
        status: { $in: ['awaiting_pickup', 'washing', 'drying', 'ready'] },
      }, '-created_date', 1);
      return cycles.length > 0;
    },
    enabled: !!user?.email,
    refetchInterval: 60_000,
  });

  // ── Mobile header: hide on scroll-down, show on scroll-up ────────────────
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) return;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;

      if (y < 10) {
        setHeaderVisible(true);
        return;
      }
      if (delta > 4) {
        setHeaderVisible(false);
      } else if (delta < -4) {
        setHeaderVisible(true);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Per-tab history tracking ─────────────────────────────────────────────
  useEffect(() => {
    if (!currentPageName) return;
    const ownerTab = BOTTOM_NAV.find(t => {
      const tabStack = tabHistoryRef.current[t.page];
      return t.page === currentPageName || (tabStack && tabStack.includes(location.pathname));
    });
    if (ownerTab) {
      const stack = tabHistoryRef.current[ownerTab.page] || [createPageUrl(ownerTab.page)];
      if (stack[stack.length - 1] !== location.pathname) {
        tabHistoryRef.current[ownerTab.page] = [...stack, location.pathname];
      }
    }
  }, [location.pathname, currentPageName]);

  // ── Tab click: re-tap = scroll to top / reset; switch = restore last path ─
  const handleTabClick = (e, page, path) => {
    e.preventDefault();
    if (currentPageName === page) {
      tabHistoryRef.current[page] = [path];
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (location.pathname !== path) navigate(path, { replace: true });
    } else {
      const tabStack = tabHistoryRef.current[page];
      const target = tabStack?.length ? tabStack[tabStack.length - 1] : path;
      setPendingTab(page);
      navigate(target, { replace: true });
      setTimeout(() => setPendingTab(null), 400);
    }
  };

  const handleGlobalRefresh = () => queryClient.invalidateQueries();
  const handleLogout = () => base44.auth.logout();

  const desktopNav = [
    ...DESKTOP_NAV_BASE,
    ...(user?.role === 'admin' ? ADMIN_NAV : []),
    ...(user?.role === 'driver' ? DRIVER_NAV : []),
  ];

  return (
    <div className="min-h-screen bg-background" style={{ overscrollBehavior: 'none' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header
        className="bg-background/95 backdrop-blur-md border-b border-border fixed top-0 left-0 right-0 z-50 shadow-sm transition-transform duration-300 ease-in-out"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
          // On mobile, translate up to hide; always visible on desktop (md+)
          transform: headerVisible ? 'translateY(0)' : 'translateY(-110%)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

          {/* Logo */}
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 flex-shrink-0">
              <img
                src="https://media.base44.com/images/public/6940c15ef41e4f2a833c9405/c37d16942_LogoROKI.png"
                alt="ROKI"
                className="w-full h-full object-contain"
                style={{ mixBlendMode: 'screen' }}
              />
            </div>
            <span className="font-bold text-foreground text-lg leading-none">ROKI</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {desktopNav.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`text-sm font-medium transition-colors relative ${
                  currentPageName === item.page
                    ? 'text-green-600 font-semibold'
                    : 'text-foreground hover:text-green-600'
                }`}
              >
                {item.name}
                {item.page === 'ActiveCycle' && hasActiveCycle && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                )}
                {currentPageName === item.page && (
                  <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-green-600 rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right side: notifications + user avatar */}
          <div className="flex items-center gap-2">
            {user && <NotificationDropdown user={user} />}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-label="Open user menu" className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold hover:from-green-600 hover:to-green-700 overflow-hidden p-0 shadow border-2 border-background">
                    {user.profile_photo
                      ? <img src={user.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                      : <span className="text-xs">{getInitials(user.full_name)}</span>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-card border-border shadow-lg" align="end">
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Profile')} className="flex items-center gap-2 text-foreground hover:text-green-600">
                      <User className="w-4 h-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-foreground hover:text-red-500">
                    <LogOut className="w-4 h-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={() => base44.auth.redirectToLogin()}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main
        id="main-content"
        tabIndex="-1"
        className="w-full mx-auto scroll-container"
        style={{
          paddingTop: 'calc(3.5rem + env(safe-area-inset-top))',    // 56px header
          paddingBottom: 'calc(4.5rem + env(safe-area-inset-bottom))', // 72px tab bar
          paddingLeft:  'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          // Desktop: no bottom tab, max width
          maxWidth: '80rem',
        }}
      >
        <div className="md:pb-0 pb-0">
          <PullToRefresh onRefresh={handleGlobalRefresh}>
            <PageTransition pageKey={location.pathname}>
              <ErrorBoundary label="Page failed to load. Please retry.">
                {children}
              </ErrorBoundary>
            </PageTransition>
          </PullToRefresh>
        </div>
      </main>

      {/* ── Floating Assistant ────────────────────────────────────────────── */}
      <FloatingAssistant user={user} />

      {/* ── Bottom Tab Bar — mobile only ──────────────────────────────────── */}
      <nav
        aria-label="Tab navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-background/96 backdrop-blur-md border-t border-border z-50 select-none"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft:   'env(safe-area-inset-left)',
          paddingRight:  'env(safe-area-inset-right)',
          boxShadow: '0 -1px 0 0 hsl(var(--border))',
        }}
      >
        <div className="grid grid-cols-5 h-16">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const tabStack = tabHistoryRef.current[item.page] || [];
            const isActive = currentPageName === item.page || tabStack.includes(location.pathname);
            const isLoading = pendingTab === item.page;
            const path = createPageUrl(item.page);

            return (
              <button
                key={item.page}
                onClick={(e) => handleTabClick(e, item.page, path)}
                aria-label={item.name}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 select-none transition-opacity duration-150 min-h-[44px] ${isLoading ? 'opacity-40' : 'opacity-100'}`}
              >
                {/* Pill indicator */}
                <div className={`relative flex items-center justify-center rounded-full transition-all duration-200 ${isActive ? 'bg-green-500/15 w-14 h-7' : 'w-10 h-7'}`}>
                  <Icon className={`transition-all duration-200 w-5 h-5 ${isActive ? 'text-green-600' : 'text-muted-foreground'}`} />
                  {item.page === 'ActiveCycle' && hasActiveCycle && !isActive && (
                    <span className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                  )}
                </div>
                <span className={`text-[9px] font-semibold tracking-wide uppercase leading-none ${isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}