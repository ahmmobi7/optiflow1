'use client';

import Link from 'next/link';
import type { Profile, Order } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, timeAgo } from '@/lib/utils';
import { Package, Users, TrendingUp, AlertTriangle, Wrench, ChevronRight, Store, FileText, BarChart2 } from 'lucide-react';

interface AdminDashboardClientProps {
  profile: Profile;
  stats: {
    totalOrders: number; activeOrders: number; urgentOrders: number;
    totalOpticians: number; totalTechnicians: number;
    totalRevenue: number; paidRevenue: number;
  };
  recentOrders: Order[];
}

export default function AdminDashboardClient({ profile, stats, recentOrders }: AdminDashboardClientProps) {
  const StatCard = ({ icon: Icon, label, value, sub, href, color }: {
    icon: typeof Package; label: string; value: string | number; sub?: string; href?: string; color: string;
  }) => {
    const Inner = (
      <div className={`bg-white rounded-2xl p-4 border border-slate-100 hover:shadow-sm transition card-hover`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
          <Icon className="w-4.5 h-4.5 w-5 h-5" />
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    );
    return href ? <Link href={href}>{Inner}</Link> : Inner;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="px-4 py-6 lg:px-8">
        <p className="text-slate-400 text-sm">Admin Panel</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Dashboard</h1>
      </div>

      <div className="px-4 lg:px-8 pb-8 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Package} label="Total Orders" value={stats.totalOrders} sub={`${stats.activeOrders} active`} href="/admin/orders" color="bg-blue-50 text-blue-600" />
          <StatCard icon={AlertTriangle} label="Urgent" value={stats.urgentOrders} sub="needs priority" href="/admin/orders?urgent=true" color="bg-red-50 text-red-600" />
          <StatCard icon={Store} label="Opticians" value={stats.totalOpticians} href="/admin/staff" color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Wrench} label="Technicians" value={stats.totalTechnicians} href="/admin/staff" color="bg-amber-50 text-amber-600" />
        </div>

        {/* Revenue */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-blue-200 text-sm mt-1">{formatCurrency(stats.paidRevenue)} collected</p>
            </div>
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="mt-4 bg-blue-800/30 rounded-full h-2">
            <div className="bg-white rounded-full h-2 transition-all"
              style={{ width: stats.totalRevenue > 0 ? `${(stats.paidRevenue / stats.totalRevenue) * 100}%` : '0%' }} />
          </div>
          <p className="text-blue-200 text-xs mt-1.5">
            {stats.totalRevenue > 0 ? Math.round((stats.paidRevenue / stats.totalRevenue) * 100) : 0}% collected
          </p>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/admin/orders', label: 'Manage Orders', sub: 'View & assign jobs', icon: Package, color: 'text-blue-600 bg-blue-50' },
            { href: '/admin/billing', label: 'Billing', sub: 'Invoices & payments', icon: FileText, color: 'text-emerald-600 bg-emerald-50' },
            { href: '/admin/staff', label: 'Staff Management', sub: 'Add / remove technicians', icon: Users, color: 'text-violet-600 bg-violet-50' },
            { href: '/profile', label: 'Lab Settings', sub: 'Lab name & details', icon: BarChart2, color: 'text-slate-600 bg-slate-100' },
          ].map(({ href, label, sub, icon: Icon, color }) => (
            <Link key={href} href={href}
              className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 hover:border-blue-200 hover:shadow-sm transition card-hover">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{label}</p>
                <p className="text-xs text-slate-400 truncate">{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 ml-auto flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* Recent orders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Recent Orders</h2>
            <Link href="/admin/orders" className="text-blue-600 text-sm font-medium">View all →</Link>
          </div>
          <div className="space-y-2.5">
            {recentOrders.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4 hover:border-blue-200 transition group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  order.is_urgent ? 'bg-red-100' : 'bg-slate-100'
                }`}>
                  {order.is_urgent
                    ? <AlertTriangle className="w-5 h-5 text-red-500" />
                    : <Package className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{order.customer_name}</p>
                  <p className="text-xs text-slate-400">
                    {(order.profiles as Record<string, string> | undefined)?.shop_name} · {timeAgo(order.created_at)}
                  </p>
                </div>
                <StatusBadge status={order.status} size="sm" />
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
