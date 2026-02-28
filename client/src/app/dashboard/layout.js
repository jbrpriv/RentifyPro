'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  LayoutDashboard, Building2, FileText, Users, Key, User, Loader2,
  ShieldCheck, Wrench, MessageSquare, CreditCard, BarChart2, Scale, ClipboardList,
} from 'lucide-react';

const NAV_BY_ROLE = {
  landlord: [
    { name: 'Overview',     href: '/dashboard',                  icon: LayoutDashboard },
    { name: 'Properties',   href: '/dashboard/properties',       icon: Building2 },
    { name: 'Applications', href: '/dashboard/applications',     icon: Users },
    { name: 'Agreements',   href: '/dashboard/agreements',       icon: FileText },
    { name: 'Tenants',      href: '/dashboard/landlord/tenants', icon: Users },
    { name: 'Maintenance',  href: '/dashboard/maintenance',      icon: Wrench },
    { name: 'Messages',     href: '/dashboard/messages',         icon: MessageSquare },
    { name: 'Disputes',     href: '/dashboard/disputes',         icon: Scale },
    { name: 'Profile',      href: '/dashboard/profile',          icon: User },
  ],
  tenant: [
    { name: 'Overview',    href: '/dashboard',             icon: LayoutDashboard },
    { name: 'My Lease',    href: '/dashboard/my-lease',    icon: Key },
    { name: 'Payments',    href: '/dashboard/payments',    icon: CreditCard },
    { name: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
    { name: 'Disputes',    href: '/dashboard/disputes',    icon: Scale },
    { name: 'Messages',    href: '/dashboard/messages',    icon: MessageSquare },
    { name: 'Profile',     href: '/dashboard/profile',     icon: User },
  ],
  admin: [
    { name: 'Overview',    href: '/dashboard',                  icon: LayoutDashboard },
    { name: 'Stats',       href: '/dashboard/admin',            icon: BarChart2 },
    { name: 'Users',       href: '/dashboard/admin/users',      icon: Users },
    { name: 'Agreements',  href: '/dashboard/admin/agreements', icon: FileText },
    { name: 'Properties',  href: '/dashboard/admin/properties', icon: Building2 },
    { name: 'Templates',   href: '/dashboard/admin/templates',  icon: ClipboardList },
    { name: 'Disputes',    href: '/dashboard/disputes',         icon: Scale },
    { name: 'Messages',    href: '/dashboard/messages',         icon: MessageSquare },
    { name: 'Audit Logs',  href: '/dashboard/admin/audit-logs', icon: ShieldCheck },
    { name: 'Profile',     href: '/dashboard/profile',          icon: User },
  ],
  property_manager: [
    { name: 'Overview',    href: '/dashboard',                icon: LayoutDashboard },
    { name: 'Properties',  href: '/dashboard/pm/properties',  icon: Building2 },
    { name: 'Tenants',     href: '/dashboard/pm/tenants',     icon: Users },
    { name: 'Maintenance', href: '/dashboard/pm/maintenance', icon: Wrench },
    { name: 'Messages',    href: '/dashboard/messages',       icon: MessageSquare },
    { name: 'Profile',     href: '/dashboard/profile',        icon: User },
  ],
  law_reviewer: [
    { name: 'Overview',   href: '/dashboard',                 icon: LayoutDashboard },
    { name: 'Templates',  href: '/dashboard/admin/templates', icon: Scale },
    { name: 'Agreements', href: '/dashboard/agreements',      icon: FileText },
    { name: 'Messages',   href: '/dashboard/messages',        icon: MessageSquare },
    { name: 'Profile',    href: '/dashboard/profile',         icon: User },
  ],
};

const ROLE_PULSE = {
  admin: 'bg-red-500', landlord: 'bg-indigo-500',
  property_manager: 'bg-amber-500', tenant: 'bg-green-500', law_reviewer: 'bg-purple-500',
};
const ROLE_BADGE = {
  admin: 'bg-red-100 text-red-700', landlord: 'bg-indigo-100 text-indigo-700',
  property_manager: 'bg-amber-100 text-amber-700', tenant: 'bg-green-100 text-green-700',
  law_reviewer: 'bg-purple-100 text-purple-700',
};

export default function DashboardLayout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (!stored) { router.push('/login'); } else { setUser(JSON.parse(stored)); }
  }, [router]);

  if (!user) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
    </div>
  );

  const role       = user.role || 'tenant';
  const currentNav = NAV_BY_ROLE[role] || NAV_BY_ROLE.tenant;
  const pulseColor = ROLE_PULSE[role] || 'bg-gray-400';
  const badgeColor = ROLE_BADGE[role]  || 'bg-gray-100 text-gray-600';
  const roleLabel  = role.replace('_', ' ');

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfd]">
      <Navbar />

      {/* DASHBOARD SUB-NAV BAR */}
      <div className="mt-16 bg-white border-b border-gray-100 sticky top-16 z-40 w-full shadow-sm">
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-14">
            <div className="flex space-x-1 overflow-x-auto no-scrollbar h-full items-center">
              {currentNav.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center h-full px-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${
                      isActive
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    <Icon className={`mr-1.5 h-3.5 w-3.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
            <div className="hidden sm:flex items-center gap-2 ml-4 shrink-0">
              <div className={`w-2 h-2 rounded-full animate-pulse ${pulseColor}`} />
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest ${badgeColor}`}>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-grow py-10 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto">
        {children}
      </main>
      <Footer />
    </div>
  );
}