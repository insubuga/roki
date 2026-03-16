import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from './utils';
import PageTransition from './components/mobile/PageTransition';
import { base44 } from '@/api/base44Client';
import { 
  LogOut, 
  User,
  Menu,
  X,
  Home,
  Zap,
  Activity,
  Shield,
  Settings
} from 'lucide-react';
import NotificationDropdown from './components/notifications/NotificationDropdown';
import AlertCenter from './components/alerts/AlertCenter';
import FloatingAssistant from './components/assistant/FloatingAssistant';
import ErrorBoundary from './components/error/ErrorBoundary';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [pendingTab, setPendingTab] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 10);
      // Hide header on scroll down (>60px), show on scroll up
      if (currentY > lastScrollY.current + 8 && currentY > 80) {
        setHeaderVisible(false);
        setMobileMenuOpen(false);
      } else if (currentY < lastScrollY.current - 4) {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu and dropdowns on location change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Layout auth check:', e);
      }
    };
    loadUser();
  }, []);



  const { data: hasActiveCycle } = useQuery({
    queryKey: ['hasActiveCycle', user?.email],
    queryFn: async () => {
      const cycles = await base44.entities.Cycle.filter({
        user_email: user.email,
        status: { $in: ['awaiting_pickup', 'washing', 'drying', 'ready'] }
      }, '-created_date', 1);
      return cycles.length > 0;
    },
    enabled: !!user?.email,
    refetchInterval: 60000,
  });

  const navItems = [
    { name: 'Control Center', page: 'Dashboard' },
    { name: 'Active Cycle', page: 'ActiveCycle' },
    { name: 'Network', page: 'Network' },
    { name: 'Risk & Recovery', page: 'RiskRecovery' },
    { name: 'Performance', page: 'Performance' },
    { name: 'Configuration', page: 'Configuration' },
    ...(user?.role === 'admin' ? [
      { name: 'Operations', page: 'OperationsView' },
      { name: 'Ops Intel', page: 'AdminOps' }
    ] : []),
    ...(user?.role === 'driver' ? [{ name: 'Driver', page: 'DriverDashboard' }] : []),
  ];

  const handleLogout = () => {
    base44.auth.logout();
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const bottomNavItems = [
    { name: 'Home', page: 'Dashboard', icon: Home },
    { name: 'Cycle', page: 'ActiveCycle', icon: Activity },
    { name: 'Network', page: 'Network', icon: Zap },
    { name: 'Risk', page: 'RiskRecovery', icon: Shield },
    { name: 'Settings', page: 'Configuration', icon: Settings },
  ];

  const handleTabClick = (e, page, path) => {
    e.preventDefault();
    if (currentPageName === page) {
      // Already on this tab - scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Replace history so back button doesn't cycle through tabs
      setPendingTab(page);
      navigate(path, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] overscroll-none">
      {/* Header */}
      <header
        className={`bg-background/95 backdrop-blur-md border-b border-border fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-md' : 'shadow-sm'} ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className={`flex justify-between items-center transition-all duration-300 ${scrolled ? 'h-12' : 'h-16'}`}>
            {/* Logo */}
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className={`bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md transition-all duration-300 ${scrolled ? 'w-7 h-7' : 'w-8 h-8'}`}>
                <Zap className={`text-white transition-all duration-300 ${scrolled ? 'w-4 h-4' : 'w-5 h-5'}`} />
              </div>
              <div className="flex flex-col">
                <span className={`font-bold text-foreground leading-none transition-all duration-300 ${scrolled ? 'text-lg' : 'text-xl'}`}>ROKI</span>
                {!scrolled && <span className="text-[9px] text-muted-foreground font-medium leading-none hidden sm:block">Readiness OS</span>}
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={createPageUrl(item.page)}
                  className={`text-foreground hover:text-green-600 transition-colors font-medium relative ${
                    currentPageName === item.page ? 'text-green-600 font-semibold' : ''
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {item.name}
                    {item.page === 'ActiveCycle' && hasActiveCycle && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    )}
                  </span>
                  {currentPageName === item.page && (
                    <span className="absolute -bottom-4 left-0 right-0 h-0.5 bg-green-600 rounded-full" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              {user && <NotificationDropdown user={user} />}

              {/* User Menu */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold hover:from-green-600 hover:to-green-700 overflow-hidden p-0 shadow-md border-2 border-background hover:shadow-lg transition-all">
                      {user.profile_photo ? (
                        <img src={user.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm">{getInitials(user.full_name)}</span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border-border shadow-lg" align="end">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Profile')} className="text-foreground hover:text-green-600 hover:bg-accent flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-foreground hover:text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md"
                >
                  Sign In
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-foreground hover:bg-muted select-none"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6 select-none" /> : <Menu className="w-6 h-6 select-none" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
        <div className="md:hidden bg-background border-t border-border py-4 shadow-lg absolute left-0 right-0 top-full">
          <nav className="flex flex-col gap-2 px-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={createPageUrl(item.page)}
                className="text-foreground hover:text-green-600 hover:bg-accent py-2 px-3 font-medium rounded-lg transition-colors flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
                {item.page === 'ActiveCycle' && hasActiveCycle && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                )}
              </Link>
            ))}
          </nav>
        </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6" style={{ marginTop: '64px' }}>
        <PageTransition pageKey={location.pathname}>
          <ErrorBoundary label="Page failed to load. Please retry.">
            {children}
          </ErrorBoundary>
        </PageTransition>
      </main>



      {/* Floating RokiBot */}
      <FloatingAssistant user={user} />

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50 select-none shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5 h-16">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            const isLoading = pendingTab === item.page;
            const path = createPageUrl(item.page);
            return (
              <button
                key={item.page}
                onClick={(e) => handleTabClick(e, item.page, path)}
                className={`flex flex-col items-center justify-center gap-1 select-none transition-all duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'} ${isActive ? 'text-green-600' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <div className={`relative flex items-center justify-center rounded-2xl transition-all duration-200 ${isActive ? 'bg-green-500/15 w-12 h-7' : 'w-10 h-7'}`}>
                  <Icon className={`select-none transition-all duration-200 ${isActive ? 'w-5 h-5 text-green-600' : 'w-5 h-5'}`} />
                  {item.page === 'ActiveCycle' && hasActiveCycle && !isActive && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                  )}
                </div>
                <span className={`text-[9px] font-semibold select-none tracking-wide uppercase transition-colors duration-200 ${isActive ? 'text-green-600' : 'text-muted-foreground'}`}>{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}