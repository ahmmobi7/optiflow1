'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Order, OrderStatusHistory, Profile } from '@/types';
import { ORDER_STATUS_LABELS } from '@/types';
import { StatusBadge, StatusSteps } from '@/components/StatusBadge';
import { formatDate, formatDateTime, formatCurrency, generateInvoiceNumber } from '@/lib/utils';
import {
  ChevronLeft, Package, AlertTriangle, Truck,
  FileText, Download, Clock, CheckCircle2, Loader2,
} from 'lucide-react';
import { generatePDF } from '@/lib/pdf';

interface OrderDetailClientProps {
  order: Order;
  history: OrderStatusHistory[];
  profile: Profile;
}

export default function OrderDetailClient({ order, history, profile }: OrderDetailClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [generating, setGenerating] = useState(false);

  const isStaff = profile.role === 'admin' || profile.role === 'technician';
  const basePrice = order.base_price ?? 0;
  const extraCharges = order.extra_charges ?? 0;
  const discount = order.discount ?? 0;
  const subtotal = basePrice + extraCharges;
  const totalAmount = subtotal - discount;

  const handleGenerateInvoice = async () => {
    if (basePrice === 0) return;
    setGenerating(true);
    try {
      const existingInvoices = order.invoices ?? [];
      if (existingInvoices.length > 0) {
        await generatePDF(order, existingInvoices[0] as Parameters<typeof generatePDF>[1]);
        toast.success('Invoice downloaded!');
        setGenerating(false);
        return;
      }

      const gstRate = 18;
      const gstAmount = (totalAmount * gstRate) / 100;
      const total = totalAmount + gstAmount;

      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: generateInvoiceNumber(),
          order_id: order.id,
          optician_id: order.optician_id,
          subtotal: totalAmount,
          gst_rate: gstRate,
          gst_amount: gstAmount,
          discount,
          total_amount: total,
          status: 'unpaid',
        })
        .select()
        .single();

      if (error) throw error;
      await generatePDF(order, invoice as unknown as Parameters<typeof generatePDF>[1]);
      toast.success('Invoice generated!');
      router.refresh();
    } catch {
      toast.error('Failed to generate invoice');
    }
    setGenerating(false);
  };

  const handleDeliveryRequest = async (type: 'pickup' | 'delivery' | 'urgent') => {
    const { error } = await supabase.from('delivery_requests').insert({
      order_id: order.id,
      optician_id: profile.id,
      request_type: type,
      address: profile.address,
    });
    if (error) toast.error('Failed to submit request');
    else toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} request sent!`);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{title}</h3>
      {children}
    </div>
  );

  const DataRow = ({ label, value }: { label: string; value?: string | number | null }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
      <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
        <span className="text-sm text-slate-500">{label}</span>
        <span className="text-sm font-medium text-slate-900 text-right max-w-[55%]">{value}</span>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-200 transition text-slate-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 truncate">{order.customer_name}</h1>
            <p className="text-xs text-slate-400">{order.order_number} · {formatDate(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            {order.is_urgent && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-lg urgent-pulse">URGENT</span>
            )}
            <StatusBadge status={order.status} size="sm" />
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 space-y-4 pb-8">
        <Section title="Job Progress">
          <StatusSteps status={order.status} />
        </Section>

        <Section title="Prescription">
          <div className="grid grid-cols-2 gap-4">
            {(['RE', 'LE'] as const).map(side => {
              const p = side === 'RE' ? 're' : 'le';
              return (
                <div key={side}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${side === 'RE' ? 'bg-blue-500' : 'bg-violet-500'}`}>
                      <span className="text-white text-xs font-bold">{side === 'RE' ? 'R' : 'L'}</span>
                    </div>
                    <span className="font-semibold text-sm text-slate-700">{side === 'RE' ? 'Right Eye' : 'Left Eye'}</span>
                  </div>
                  {[
                    ['SPH', (order as Record<string, string | null>)[`${p}_sph`]],
                    ['CYL', (order as Record<string, string | null>)[`${p}_cyl`]],
                    ['AXIS', (order as Record<string, string | null>)[`${p}_axis`]],
                    ['ADD', (order as Record<string, string | null>)[`${p}_add`]],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between text-sm py-1">
                      <span className="text-slate-400">{label}</span>
                      <span className="font-mono font-semibold text-slate-900">{val ?? '—'}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">PD Distance</span>
              <span className="font-semibold text-slate-900">{order.pd_distance ?? '—'}</span>
            </div>
            {order.pd_near && (
              <div className="flex justify-between text-sm mt-1.5">
                <span className="text-slate-400">PD Near</span>
                <span className="font-semibold text-slate-900">{order.pd_near}</span>
              </div>
            )}
          </div>
        </Section>

        <Section title="Frame &amp; Lens">
          <DataRow label="Frame Type" value={order.frame_type} />
          <DataRow label="Frame Brand" value={order.frame_brand} />
          <DataRow label="Lens Type" value={order.lens_type} />
          <DataRow label="Lens Material" value={order.lens_material} />
          <DataRow label="Lens Coating" value={order.lens_coating} />
        </Section>

        {order.special_instructions && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">Special Instructions</p>
            <p className="text-sm text-amber-900">{order.special_instructions}</p>
          </div>
        )}

        <Section title="Delivery">
          <DataRow label="Type" value={order.delivery_type === 'pickup' ? '🏪 Shop Pickup' : '🚚 Delivery'} />
          <DataRow label="Address" value={order.delivery_address} />
          <DataRow label="Expected By" value={order.estimated_delivery ? formatDate(order.estimated_delivery) : null} />
          <DataRow label="Delivered On" value={order.actual_delivery_date ? formatDate(order.actual_delivery_date) : null} />
        </Section>

        {(basePrice > 0 || isStaff) && (
          <Section title="Pricing">
            <DataRow label="Base Price" value={formatCurrency(basePrice)} />
            {extraCharges > 0 && <DataRow label="Extra Charges" value={formatCurrency(extraCharges)} />}
            {discount > 0 && <DataRow label="Discount" value={`-${formatCurrency(discount)}`} />}
            <div className="flex justify-between pt-3 border-t border-slate-100 mt-2">
              <span className="font-bold text-slate-900">Total</span>
              <span className="font-bold text-blue-700 text-lg">{formatCurrency(totalAmount)}</span>
            </div>
          </Section>
        )}

        {history.length > 0 && (
          <Section title="Activity Log">
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                      {i === 0 ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-3 h-3" />}
                    </div>
                    {i < history.length - 1 && <div className="w-0.5 h-full bg-slate-100 mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm font-semibold text-slate-800">{ORDER_STATUS_LABELS[h.status]}</p>
                    {h.notes && <p className="text-xs text-slate-400 mt-0.5">{h.notes}</p>}
                    <p className="text-xs text-slate-300 mt-1">{formatDateTime(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <div className="grid grid-cols-2 gap-3">
          {order.status !== 'delivered' && !isStaff && (
            <>
              <button onClick={() => handleDeliveryRequest('pickup')}
                className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold py-3 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition">
                <Truck className="w-4 h-4" />Request Pickup
              </button>
              <button onClick={() => handleDeliveryRequest('urgent')}
                className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-red-600 text-sm font-semibold py-3 rounded-xl hover:border-red-300 hover:bg-red-50 transition">
                <AlertTriangle className="w-4 h-4" />Urgent Request
              </button>
            </>
          )}
          <button
            onClick={handleGenerateInvoice}
            disabled={generating || basePrice === 0}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition col-span-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {basePrice === 0 ? 'Set price to generate invoice' : 'Download Invoice PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
