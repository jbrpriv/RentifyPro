'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2 } from 'lucide-react';

export default function Footer() {
  const [user, setUser] = useState(null);
  const pathname = usePathname();

  // Check auth state whenever the route changes
  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (stored) setUser(JSON.parse(stored));
    else setUser(null);
  }, [pathname]);

  return (
    <footer className="bg-gray-900 py-12 border-t border-gray-800 mt-auto">
      {/* Container changed to w-full and added wider horizontal padding to match Navbar */}
      <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Logo Section */}
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-500" />
          <span className="text-xl font-bold text-white">RentifyPro</span>
        </div>

        {/* Copyright Section */}
        <p className="text-gray-400 text-sm">
          © {new Date().getFullYear()} RentifyPro. All rights reserved.
        </p>

        {/* Conditional Links Section */}
        <div className="flex gap-6">
          <Link href="/browse" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
            Browse
          </Link>
          
          {!user ? (
            <>
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
                Sign In
              </Link>
              <Link href="/register" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
                Register
              </Link>
            </>
          ) : (
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
              Dashboard
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}