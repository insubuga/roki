import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import PageTransition from './components/mobile/PageTransition';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  ShoppingCart, 
  LogOut, 
  User,
  ChevronDown,
  Menu,
  X,
  Home,
  Lock,
  Zap,
  Shirt
} from 'lucide-react';
import NotificationDropdown from './components/notifications/NotificationDropdown';
import FloatingAssistant from './components/assistant/FloatingAssistant';
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
  const location = useLocation();
  const navigate = useNavigate();

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

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: () => base44.entities.CartItem.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const cartCount = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);

  const navItems = [
    { name: 'Dashboard', page: 'Dashboard' },
    { name: 'Shop', page: 'Shop', hasDropdown: true },
    ...(user?.role === 'driver' || user?.role === 'admin' ? [{ name: 'Driver', page: 'DriverDashboard' }] : []),
    ...(user?.role === 'user' && !user?.role.includes('driver') ? [{ name: 'Become a Driver', page: 'DriverOnboarding' }] : []),
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
    { name: 'Locker', page: 'Profile', icon: Lock, key: 'locker' },
    { name: 'Rush', page: 'RushMode', icon: Zap },
    { name: 'Laundry', page: 'LaundryOrder', icon: Shirt },
    { name: 'Profile', page: 'Profile', icon: User, key: 'profile' },
  ];

  const handleTabClick = (page) => {
    if (currentPageName === page) {
      // Already on this tab - scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] overscroll-none">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200 fixed top-0 left-0 right-0 z-50 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent leading-none">ROKI</span>
                <span className="text-[9px] text-gray-500 font-medium leading-none hidden sm:block">Readiness OS</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                item.hasDropdown ? (
                  <DropdownMenu key={item.name}>
                    <DropdownMenuTrigger className="flex items-center gap-1 text-gray-700 hover:text-green-600 transition-colors font-medium">
                      {item.name}
                      <ChevronDown className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white border-gray-200 shadow-lg">
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Shop')} className="text-gray-700 hover:text-green-600 hover:bg-green-50">
                          Browse Supplements
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Cart')} className="text-gray-700 hover:text-green-600 hover:bg-green-50">
                          View Cart
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.page)}
                    className={`text-gray-700 hover:text-green-600 transition-colors font-medium relative ${
                      currentPageName === item.page ? 'text-green-600 font-semibold' : ''
                    }`}
                  >
                    {item.name}
                    {currentPageName === item.page && (
                      <span className="absolute -bottom-4 left-0 right-0 h-0.5 bg-green-600 rounded-full" />
                    )}
                  </Link>
                )
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              {user && <NotificationDropdown user={user} />}

              {/* Cart */}
              <Link to={createPageUrl('Cart')} className="relative">
                <Button variant="outline" size="icon" className="bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300">
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                </Button>
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-gradient-to-br from-green-500 to-green-600 text-white text-xs h-5 w-5 flex items-center justify-center p-0 shadow-md border-2 border-white">
                    {cartCount}
                  </Badge>
                )}
              </Link>

              {/* User Menu */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold hover:from-green-600 hover:to-green-700 overflow-hidden p-0 shadow-md border-2 border-white hover:shadow-lg transition-all">
                      {user.profile_photo ? (
                        <img src={user.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm">{getInitials(user.full_name)}</span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white border-gray-200 shadow-lg" align="end">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Profile')} className="text-gray-700 hover:text-green-600 hover:bg-green-50 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-gray-700 hover:text-red-600 hover:bg-red-50 flex items-center gap-2">
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
                className="md:hidden text-gray-700 hover:bg-gray-100 select-none"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6 select-none" /> : <Menu className="w-6 h-6 select-none" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 py-4 shadow-lg absolute left-0 right-0 top-full">
          <nav className="flex flex-col gap-2 px-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={createPageUrl(item.page)}
                className="text-gray-700 hover:text-green-600 hover:bg-green-50 py-2 px-3 font-medium rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6" style={{ marginTop: '64px' }}>
        <PageTransition pageKey={location.pathname}>
          {children}
        </PageTransition>
      </main>

      {/* Floating Assistant */}
      <FloatingAssistant user={user} />

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 select-none shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5 h-16">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.key || item.page}
                to={createPageUrl(item.page)}
                onClick={() => handleTabClick(item.page)}
                className={`flex flex-col items-center justify-center gap-0.5 select-none transition-all ${
                  isActive ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-green-50' : ''}`}>
                  <Icon className={`w-5 h-5 select-none ${isActive ? 'text-green-600' : 'text-gray-500'}`} />
                </div>
                <span className={`text-[10px] font-medium select-none leading-tight ${isActive ? 'text-green-600' : 'text-gray-600'}`}>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}