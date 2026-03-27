'use client';

import Link from 'next/link';
import type { Profile, Order } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { timeAgo } from '@/lib/utils';
import {
  Package, PlusCircle, Clock, CheckCircle2,
  TrendingUp, ChevronRight, Bell, Zap,
} from 'lucide-react';

interface DashboardClientProps {
  profile: Profile;
  recentOrders: Order[];
  stats: { total: number; active: number; ready: number };
}

export default function DashboardClient({ profile, recentOrders, stats }: DashboardClientProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = profile.owner_name ?? profile.shop_name ?? 'there';

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm">{greeting} 👋</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{displayName}</h1>
          {profile.shop_name && <p className="text-slate-400 text-sm">{profile.shop_name}</p>}
        </div>
        <Link
          href="/orders/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm shadow-blue-200 active:scale-[0.97]"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Order</span>
          <span className="sm:hidden">Order</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Orders', value: stats.total, icon: Package, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'In Progress', value: stats.active, icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' },
          { label: 'Ready', value: stats.ready, icon: CheckCircle2, bg: 'bg-green-50', color: 'text-green-600' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Ready for pickup alert */}
      {stats.ready > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-green-900 text-sm">
              {stats.ready} order{stats.ready > 1 ? 's' : ''} ready for pickup!
            </p>
            <p className="text-green-600 text-xs mt-0.5">Visit the lab or request delivery</p>
          </div>
          <Link href="/orders?status=ready_for_delivery" className="text-green-700 flex-shrink-0">
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/orders/new" className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white card-hover shadow-sm shadow-blue-200">
          <PlusCircle className="w-6 h-6 mb-3 opacity-80" />
          <p className="font-semibold text-sm">Place New Order</p>
          <p className="text-blue-200 text-xs mt-0.5">Submit a spectacle job</p>
        </Link>
        <Link href="/orders" className="bg-white border border-slate-100 rounded-2xl p-4 card-hover shadow-sm">
          <Package className="w-6 h-6 mb-3 text-slate-400" />
          <p className="font-semibold text-sm text-slate-900">Track Orders</p>
          <p className="text-slate-400 text-xs mt-0.5">View all job statuses</p>
        </Link>
        <Link href="/invoices" className="bg-white border border-slate-100 rounded-2xl p-4 card-hover shadow-sm">
          <TrendingUp className="w-6 h-6 mb-3 text-slate-400" />
          <p className="font-semibold text-sm text-slate-900">Invoices</p>
          <p className="text-slate-400 text-xs mt-0.5">View bills & payments</p>
        </Link>
        <Link href="/profile" className="bg-white border border-slate-100 rounded-2xl p-4 card-hover shadow-sm">
          <Zap className="w-6 h-6 mb-3 text-slate-400" />
          <p className="font-semibold text-sm text-slate-900">Shop Profile</p>
          <p className="text-slate-400 text-xs mt-0.5">Update your details</p>
        </Link>
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Recent Orders</h2>
          <Link href="/orders" className="text-blue-600 text-sm font-medium hover:text-blue-700">View all →</Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-900 mb-1">No orders yet</p>
            <p className="text-slate-400 text-sm mb-4">Place your first spectacle job order</p>
            <Link href="/orders/new" className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition">
              <PlusCircle className="w-4 h-4" />New Order
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4 hover:border-blue-200 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 text-sm truncate">{order.customer_name}</p>
                    {order.is_urgent && (
                      <span className="bg-red-100 text-red-600 text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">Urgent</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{order.order_number} · {timeAgo(order.created_at)}</p>
                </div>
                <StatusBadge status={order.status} size="sm" />
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
