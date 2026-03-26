'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Order, Profile, OrderStatus } from '@/types';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { timeAgo } from '@/lib/utils';
import { Search, Filter, Package, AlertTriangle, ChevronRight, Wrench, X } from 'lucide-react';

interface AdminOrdersClientProps {
  orders: Order[];
  technicians: Pick<Profile, 'id' | 'owner_name' | 'email'>[];
  profile: Profile;
}

export default function AdminOrdersClient({ orders: initialOrders, technicians, profile }: AdminOrdersClientProps) {
  const supabase = createClient();
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let r = orders;
    if (statusFilter) r = r.filter(o => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(o =>
        o.customer_name.toLowerCase().includes(q) ||
        o.order_number.toLowerCase().includes(q) ||
        (o.profiles as Record<string, string> | undefined)?.shop_name?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [orders, statusFilter, search]);

  const handleAssignTechnician = async (orderId: string, techId: string | null) => {
    setAssigning(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ assigned_technician_id: techId })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to assign');
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, assigned_technician_id: techId || undefined } : o));
      toast.success(techId ? 'Technician assigned!' : 'Technician removed');
    }
    setAssigning(null);
  };

  const handleStatusUpdate = async (order: Order, newStatus: OrderStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    if (error) { toast.error('Failed'); return; }

    await supabase.from('order_status_history').insert({
      order_id: order.id, status: newStatus, updated_by: profile.id,
    });
    await supabase.from('notifications').insert({
      user_id: order.optician_id, order_id: order.id,
      title: `Order ${ORDER_STATUS_LABELS[newStatus]}`,
      message: `Order ${order.order_number} for ${order.customer_name} is now: ${ORDER_STATUS_LABELS[newStatus]}`,
      type: newStatus === 'delivered' ? 'success' : 'info',
    });

    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
    toast.success('Status updated!');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 py-4 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">All Orders</h1>
            <p className="text-slate-400 text-xs">{filtered.length} of {orders.length} orders</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search orders, shops..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-400 transition" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition ${
              statusFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
            }`}>
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
        {showFilters && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button onClick={() => setStatusFilter('')}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${!statusFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>
              All
            </button>
            {ORDER_STATUSES.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                {ORDER_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 lg:p-8 space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-900">No orders found</p>
          </div>
        ) : (
          filtered.map(order => (
            <div key={order.id} className={`bg-white rounded-2xl border p-4 space-y-3 ${
              order.is_urgent ? 'border-red-200' : 'border-slate-100'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    order.is_urgent ? 'bg-red-100' : 'bg-slate-100'
                  }`}>
                    {order.is_urgent
                      ? <AlertTriangle className="w-5 h-5 text-red-500" />
                      : <Package className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/orders/${order.id}`}
                        className="font-semibold text-slate-900 text-sm hover:text-blue-600 transition truncate">
                        {order.customer_name}
                      </Link>
                      {order.is_urgent && (
                        <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 rounded-full flex-shrink-0">URGENT</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{order.order_number} · {(order.profiles as Record<string, string> | undefined)?.shop_name}</p>
                    <p className="text-xs text-slate-300 mt-0.5">{timeAgo(order.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={order.status} size="sm" />
                  <Link href={`/orders/${order.id}`} className="text-slate-300 hover:text-blue-500 transition">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Assign technician */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <Wrench className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <select
                  value={order.assigned_technician_id || ''}
                  onChange={e => handleAssignTechnician(order.id, e.target.value || null)}
                  disabled={assigning === order.id}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:border-blue-400 transition">
                  <option value="">— Assign Technician —</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.owner_name || t.email}</option>
                  ))}
                </select>

                {/* Quick status update */}
                {order.status !== 'delivered' && (
                  <select
                    value={order.status}
                    onChange={e => handleStatusUpdate(order, e.target.value as OrderStatus)}
                    className="flex-1 text-xs bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5 text-blue-700 font-medium focus:border-blue-400 transition">
                    {ORDER_STATUSES.map(s => (
                      <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
