import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  ShoppingCart, 
  LogOut, 
  User,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import NotificationDropdown from './components/notifications/NotificationDropdown';
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

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        // Not logged in
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
    { name: 'Community', page: 'Community' },
  ];

  const handleLogout = () => {
    base44.auth.logout();
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Header */}
      <header className="bg-[#0d1320] border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#7cfc00] rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-black" />
              </div>
              <span className="text-xl font-bold text-white">VANTA</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                item.hasDropdown ? (
                  <DropdownMenu key={item.name}>
                    <DropdownMenuTrigger className="flex items-center gap-1 text-gray-300 hover:text-white transition-colors">
                      {item.name}
                      <ChevronDown className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#1a2332] border-gray-700">
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Shop')} className="text-gray-300 hover:text-white">
                          Browse Supplements
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Cart')} className="text-gray-300 hover:text-white">
                          View Cart
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.page)}
                    className={`text-gray-300 hover:text-white transition-colors ${
                      currentPageName === item.page ? 'text-white' : ''
                    }`}
                  >
                    {item.name}
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
                <Button variant="outline" size="icon" className="bg-transparent border-gray-700 hover:bg-gray-800">
                  <ShoppingCart className="w-5 h-5 text-gray-300" />
                </Button>
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-[#7cfc00] text-black text-xs h-5 w-5 flex items-center justify-center p-0">
                    {cartCount}
                  </Badge>
                )}
              </Link>

              {/* User Menu */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-10 h-10 rounded-full bg-[#7cfc00] text-black font-bold hover:bg-[#6be600] overflow-hidden p-0">
                      {user.profile_photo ? (
                        <img src={user.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{getInitials(user.full_name)}</span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#1a2332] border-gray-700" align="end">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Profile')} className="text-gray-300 hover:text-white flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-gray-300 hover:text-white flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-[#7cfc00] text-black hover:bg-[#6be600]"
                >
                  Sign In
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-gray-300"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0d1320] border-t border-gray-800 py-4">
            <nav className="flex flex-col gap-2 px-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={createPageUrl(item.page)}
                  className="text-gray-300 hover:text-white py-2"
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}