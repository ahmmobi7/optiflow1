'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Profile, Order, OrderStatus } from '@/types';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { timeAgo } from '@/lib/utils';
import { Search, Package, PlusCircle, Filter, ChevronRight, AlertTriangle, X } from 'lucide-react';

interface OrdersClientProps {
  profile: Profile;
  orders: Order[];
  initialStatus?: string;
}

export default function OrdersClient({ profile, orders, initialStatus }: OrdersClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>((initialStatus as OrderStatus) || '');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = orders;
    if (statusFilter) result = result.filter(o => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        (o.customer_name ?? '').toLowerCase().includes(q) ||
        (o.order_number ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, statusFilter, search]);

  const urgentCount = orders.filter(o => o.is_urgent && o.status !== 'delivered').length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 py-4 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Orders</h1>
            <p className="text-slate-400 text-xs">{orders.length} total</p>
          </div>
          <Link href="/orders/new" className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-xl shadow-sm hover:bg-blue-700 transition">
            <PlusCircle className="w-4 h-4" />New
          </Link>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search orders, names..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-400 transition"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition ${statusFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
          >
            <Filter className="w-4 h-4" />
            {statusFilter ? ORDER_STATUS_LABELS[statusFilter] : 'Filter'}
          </button>
        </div>
        {showFilters && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button onClick={() => { setStatusFilter(''); setShowFilters(false); }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${!statusFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>
              All
            </button>
            {ORDER_STATUSES.map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setShowFilters(false); }}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                {ORDER_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 lg:p-8 space-y-3">
        {urgentCount > 0 && !statusFilter && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm font-medium">{urgentCount} urgent order{urgentCount > 1 ? 's' : ''} pending</p>
          </div>
        )}

        {statusFilter && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Filtered by:</span>
            <button onClick={() => setStatusFilter('')}
              className="flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              {ORDER_STATUS_LABELS[statusFilter]} <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-900 mb-1">
              {search || statusFilter ? 'No orders found' : 'No orders yet'}
            </p>
            <p className="text-slate-400 text-sm mb-5">
              {search || statusFilter ? 'Try adjusting your filters' : 'Start by placing your first order'}
            </p>
            {!search && !statusFilter && (
              <Link href="/orders/new" className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition">
                <PlusCircle className="w-4 h-4" />New Order
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all group card-hover"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${order.is_urgent ? 'bg-red-100' : 'bg-slate-100'}`}>
                        {order.is_urgent
                          ? <AlertTriangle className="w-5 h-5 text-red-500" />
                          : <Package className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 text-sm truncate">{order.customer_name}</p>
                          {order.is_urgent && (
                            <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">URGENT</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{order.order_number}</p>
                        <div className="mt-1.5">
                          <StatusBadge status={order.status} size="sm" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">{timeAgo(order.created_at)}</p>
                        {(order.base_price ?? 0) > 0 && (
                          <p className="text-sm font-semibold text-slate-700 mt-0.5">₹{order.base_price}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
