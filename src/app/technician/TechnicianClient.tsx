'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Order, Profile, OrderStatus } from '@/types';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { timeAgo } from '@/lib/utils';
import { Package, AlertTriangle, CheckCircle2, Clock, Wrench } from 'lucide-react';

interface TechnicianClientProps {
  orders: Order[];
  profile: Profile;
}

export default function TechnicianClient({ orders: initialOrders, profile }: TechnicianClientProps) {
  const supabase = createClient();
  const [orders, setOrders] = useState(initialOrders);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [notes, setNotes] = useState('');

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    const idx = ORDER_STATUSES.indexOf(current);
    return idx < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[idx + 1] : null;
  };

  const handleUpdateStatus = async (order: Order, newStatus: OrderStatus) => {
    setUpdating(order.id);
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status: newStatus,
        updated_by: profile.id,
        notes: notes.trim() || null,
      });

      await supabase.from('notifications').insert({
        user_id: order.optician_id,
        order_id: order.id,
        title: `Order ${ORDER_STATUS_LABELS[newStatus]}`,
        message: `Your order ${order.order_number} for ${order.customer_name} is now: ${ORDER_STATUS_LABELS[newStatus]}`,
        type: newStatus === 'delivered' ? 'success' : 'info',
      });

      setOrders(prev =>
        prev
          .map(o => o.id === order.id ? { ...o, status: newStatus } : o)
          .filter(o => o.status !== 'delivered')
      );

      toast.success(`Status: ${ORDER_STATUS_LABELS[newStatus]}`);
      setSelectedOrder(null);
      setNotes('');
    }
    setUpdating(null);
  };

  const urgentOrders = orders.filter(o => o.is_urgent);
  const normalOrders = orders.filter(o => !o.is_urgent);

  const OrderCard = ({ order }: { order: Order }) => {
    const nextStatus = getNextStatus(order.status);
    const isUpdating = updating === order.id;
    const shopName = order.profiles?.shop_name ?? order.profiles?.owner_name ?? 'Unknown Shop';

    return (
      <div className={`bg-white rounded-2xl border ${order.is_urgent ? 'border-red-200' : 'border-slate-100'} p-4 space-y-3`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${order.is_urgent ? 'bg-red-100' : 'bg-slate-100'}`}>
              {order.is_urgent
                ? <AlertTriangle className="w-5 h-5 text-red-500" />
                : <Package className="w-5 h-5 text-slate-500" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{order.customer_name}</p>
              <p className="text-xs text-slate-400">{order.order_number} · {timeAgo(order.created_at)}</p>
              <p className="text-xs text-slate-500 mt-0.5">{shopName}</p>
            </div>
          </div>
          <StatusBadge status={order.status} size="sm" />
        </div>

        <div className="bg-slate-50 rounded-xl px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="text-xs"><span className="text-slate-400">Frame: </span><span className="font-medium text-slate-700">{order.frame_type}</span></div>
          <div className="text-xs"><span className="text-slate-400">Lens: </span><span className="font-medium text-slate-700">{order.lens_type}</span></div>
          <div className="text-xs"><span className="text-slate-400">RE: </span><span className="font-mono font-medium text-slate-700">{order.re_sph ?? '—'}/{order.re_cyl ?? '—'}</span></div>
          <div className="text-xs"><span className="text-slate-400">LE: </span><span className="font-mono font-medium text-slate-700">{order.le_sph ?? '—'}/{order.le_cyl ?? '—'}</span></div>
        </div>

        {order.special_instructions && (
          <div className="bg-amber-50 rounded-xl px-3 py-2 text-xs text-amber-800">
            <span className="font-semibold">Note: </span>{order.special_instructions}
          </div>
        )}

        {nextStatus && (
          <button
            onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
            className="w-full py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition"
          >
            Update Status →
          </button>
        )}

        {selectedOrder?.id === order.id && nextStatus && (
          <div className="bg-blue-50 rounded-xl p-3 space-y-3 border border-blue-200">
            <p className="text-sm font-semibold text-blue-900">
              Move to: <span className="text-blue-700">{ORDER_STATUS_LABELS[nextStatus]}</span>
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes (optional)..."
              rows={2}
              className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm resize-none focus:border-blue-400 transition"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(order, nextStatus)}
                disabled={isUpdating}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
              >
                {isUpdating
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />}
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
            <Wrench className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Jobs</h1>
            <p className="text-slate-400 text-xs">{orders.length} active · {urgentOrders.length} urgent</p>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 space-y-5">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-900 mb-1">All caught up!</p>
            <p className="text-slate-400 text-sm">No pending jobs at the moment.</p>
          </div>
        ) : (
          <>
            {urgentOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h2 className="font-bold text-red-700 text-sm uppercase tracking-wide">Urgent ({urgentOrders.length})</h2>
                </div>
                <div className="space-y-3">
                  {urgentOrders.map(o => <OrderCard key={o.id} order={o} />)}
                </div>
              </div>
            )}

            {normalOrders.length > 0 && (
              <div>
                {urgentOrders.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <h2 className="font-bold text-slate-500 text-sm uppercase tracking-wide">Regular Jobs ({normalOrders.length})</h2>
                  </div>
                )}
                <div className="space-y-3">
                  {normalOrders.map(o => <OrderCard key={o.id} order={o} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
