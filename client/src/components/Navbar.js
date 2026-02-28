'use client';

import Link from 'next/link';
import { Building2, LayoutDashboard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (stored) setUser(JSON.parse(stored));
  }, [pathname]); // Refresh user state on page change

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  return (
    <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100 top-0">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Left Side: Logo + Main Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                RentifyPro
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-6">
              <Link href="/browse" className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors">
                Browse Properties
              </Link>
              <Link href="/#features" className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors">
                Features
              </Link>
              <Link href="/#how-it-works" className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors">
                About
              </Link>
              {user && (
                <Link href="/dashboard" className="flex items-center text-sm font-bold text-blue-600 transition-colors">
                  <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
                </Link>
              )}
            </div>
          </div>

          {/* Right Side: Auth Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Signed in as</p>
                  <p className="text-xs font-black text-gray-900 leading-none">{user.name}</p>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="text-xs font-black text-red-500 hover:text-red-600 uppercase tracking-widest border border-red-100 px-3 py-2 rounded-lg hover:bg-red-50 transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors">
                  Sign In
                </Link>
                <Link href="/register" className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}