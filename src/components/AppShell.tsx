'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { Profile } from '@/types';
import {
  LayoutDashboard, Package, PlusCircle, FileText, Bell,
  User, LogOut, Layers, Menu, X, ChevronRight, Settings, Users
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  profile: Profile;
  notificationCount?: number;
}

export default function AppShell({ children, profile, notificationCount = 0 }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = profile.role === 'admin';
  const isTechnician = profile.role === 'technician';
  const isOptician = profile.role === 'optician';

  const opticianNav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/orders', label: 'My Orders', icon: Package },
    { href: '/orders/new', label: 'New Order', icon: PlusCircle },
    { href: '/invoices', label: 'Invoices', icon: FileText },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const adminNav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'All Orders', icon: Package },
    { href: '/admin/billing', label: 'Billing', icon: FileText },
    { href: '/admin/staff', label: 'Staff', icon: Users },
    { href: '/profile', label: 'Settings', icon: Settings },
  ];

  const technicianNav = [
    { href: '/technician', label: 'My Jobs', icon: Package },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const navItems = isAdmin ? adminNav : isTechnician ? technicianNav : opticianNav;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const displayName = profile.shop_name || profile.owner_name || profile.email;
  const roleLabel = isAdmin ? 'Admin' : isTechnician ? 'Technician' : 'Optician';
  const roleBg = isAdmin ? 'bg-violet-100 text-violet-700' : isTechnician ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex-col z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Layers className="w-4.5 h-4.5 text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">OptiFlow</span>
        </div>

        {/* Profile card */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="bg-slate-50 rounded-xl px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">
                  {(displayName || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${roleBg}`}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}>
                <Icon className="w-4.5 h-4.5 w-5 h-5 flex-shrink-0" />
                {label}
                {label === 'Notifications' && notificationCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-100">
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all">
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">OptiFlow</span>
          </div>
          <div className="flex items-center gap-2">
            {notificationCount > 0 && (
              <div className="relative">
                <Bell className="w-5 h-5 text-slate-500" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              </div>
            )}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed top-14 right-0 bottom-0 w-72 bg-white z-30 shadow-2xl transform transition-transform duration-200 ${
        mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{(displayName || 'U')[0].toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900">{displayName}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBg}`}>{roleLabel}</span>
            </div>
          </div>
        </div>
        <nav className="px-3 py-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
                <ChevronRight className="w-4 h-4 ml-auto opacity-40" />
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pt-3 border-t border-slate-100 mt-3">
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 bottom-nav">
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  isActive ? 'text-blue-600' : 'text-slate-400'
                }`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                  {label.split(' ')[0]}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        <div className="page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
