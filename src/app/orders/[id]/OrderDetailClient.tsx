'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Order, OrderStatusHistory, Profile, OrderStatus } from '@/types';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@/types';
import { StatusBadge, StatusSteps } from '@/components/StatusBadge';
import { formatDate, formatDateTime, formatCurrency, generateInvoiceNumber } from '@/lib/utils';
import {
  ChevronLeft, Package, AlertTriangle, Eye, Truck, Phone,
  FileText, Download, Share2, Clock, User, CheckCircle2, Loader2, Image
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
  const subtotal = order.base_price + order.extra_charges;
  const totalAmount = subtotal - order.discount;

  const handleGenerateInvoice = async () => {
    setGenerating(true);
    try {
      // Check if invoice already exists
      if (order.invoices && order.invoices.length > 0) {
        await generatePDF(order, order.invoices[0]);
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
          discount: order.discount,
          total_amount: total,
          status: 'unpaid',
        })
        .select()
        .single();

      if (error) throw error;

      await generatePDF(order, invoice);
      toast.success('Invoice generated and downloaded!');
      router.refresh();
    } catch (err) {
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

    if (error) {
      toast.error('Failed to submit request');
    } else {
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} request sent!`);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{title}</h3>
      {children}
    </div>
  );

  const DataRow = ({ label, value }: { label: string; value?: string | number | null }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
        <span className="text-sm text-slate-500">{label}</span>
        <span className="text-sm font-medium text-slate-900 text-right max-w-[55%]">{value}</span>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
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
        {/* Progress */}
        <Section title="Job Progress">
          <StatusSteps status={order.status} />
        </Section>

        {/* Prescription */}
        <Section title="Prescription">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">R</span>
                </div>
                <span className="font-semibold text-sm text-slate-700">Right Eye</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">SPH</span>
                  <span className="font-mono font-semibold text-slate-900">{order.re_sph || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">CYL</span>
                  <span className="font-mono font-semibold text-slate-900">{order.re_cyl || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">AXIS</span>
                  <span className="font-mono font-semibold text-slate-900">{order.re_axis || '—'}</span>
                </div>
                {order.re_add && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">ADD</span>
                    <span className="font-mono font-semibold text-slate-900">{order.re_add}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">L</span>
                </div>
                <span className="font-semibold text-sm text-slate-700">Left Eye</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">SPH</span>
                  <span className="font-mono font-semibold text-slate-900">{order.le_sph || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">CYL</span>
                  <span className="font-mono font-semibold text-slate-900">{order.le_cyl || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">AXIS</span>
                  <span className="font-mono font-semibold text-slate-900">{order.le_axis || '—'}</span>
                </div>
                {order.le_add && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">ADD</span>
                    <span className="font-mono font-semibold text-slate-900">{order.le_add}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">PD Distance</span>
              <span className="font-semibold text-slate-900">{order.pd_distance || '—'}</span>
            </div>
            {order.pd_near && (
              <div className="flex justify-between text-sm mt-1.5">
                <span className="text-slate-400">PD Near</span>
                <span className="font-semibold text-slate-900">{order.pd_near}</span>
              </div>
            )}
          </div>
        </Section>

        {/* Frame & Lens */}
        <Section title="Frame & Lens">
          <DataRow label="Frame Type" value={order.frame_type} />
          <DataRow label="Frame Brand" value={order.frame_brand} />
          <DataRow label="Lens Type" value={order.lens_type} />
          <DataRow label="Lens Material" value={order.lens_material} />
          <DataRow label="Lens Coating" value={order.lens_coating} />
        </Section>

        {/* Special instructions */}
        {order.special_instructions && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">Special Instructions</p>
            <p className="text-sm text-amber-900">{order.special_instructions}</p>
          </div>
        )}

        {/* Photos */}
        {(order.prescription_photo_url || order.frame_photo_url) && (
          <Section title="Attachments">
            <div className="grid grid-cols-2 gap-3">
              {order.prescription_photo_url && (
                <a href={order.prescription_photo_url} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition border border-slate-100">
                  <Image className="w-6 h-6 text-blue-500" />
                  <span className="text-xs font-medium text-slate-600">Prescription</span>
                </a>
              )}
              {order.frame_photo_url && (
                <a href={order.frame_photo_url} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition border border-slate-100">
                  <Image className="w-6 h-6 text-violet-500" />
                  <span className="text-xs font-medium text-slate-600">Frame Photo</span>
                </a>
              )}
            </div>
          </Section>
        )}

        {/* Delivery */}
        <Section title="Delivery">
          <DataRow label="Type" value={order.delivery_type === 'pickup' ? '🏪 Shop Pickup' : '🚚 Delivery'} />
          <DataRow label="Address" value={order.delivery_address} />
          <DataRow label="Expected By" value={order.estimated_delivery ? formatDate(order.estimated_delivery) : undefined} />
          <DataRow label="Delivered On" value={order.actual_delivery_date ? formatDate(order.actual_delivery_date) : undefined} />
        </Section>

        {/* Pricing */}
        {(order.base_price > 0 || isStaff) && (
          <Section title="Pricing">
            <DataRow label="Base Price" value={formatCurrency(order.base_price)} />
            {order.extra_charges > 0 && <DataRow label="Extra Charges" value={formatCurrency(order.extra_charges)} />}
            {order.discount > 0 && <DataRow label="Discount" value={`-${formatCurrency(order.discount)}`} />}
            <div className="flex justify-between pt-3 border-t border-slate-100 mt-2">
              <span className="font-bold text-slate-900">Total</span>
              <span className="font-bold text-blue-700 text-lg">{formatCurrency(totalAmount)}</span>
            </div>
          </Section>
        )}

        {/* Status History */}
        {history.length > 0 && (
          <Section title="Activity Log">
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      i === 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {i === 0 ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-3 h-3" />}
                    </div>
                    {i < history.length - 1 && <div className="w-0.5 h-full bg-slate-100 mt-1 mb-0" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm font-semibold text-slate-800">{ORDER_STATUS_LABELS[h.status as OrderStatus]}</p>
                    {h.notes && <p className="text-xs text-slate-400 mt-0.5">{h.notes}</p>}
                    <p className="text-xs text-slate-300 mt-1">{formatDateTime(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          {order.status !== 'delivered' && !isStaff && (
            <>
              <button onClick={() => handleDeliveryRequest('pickup')}
                className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold py-3 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition">
                <Truck className="w-4 h-4" />
                Request Pickup
              </button>
              <button onClick={() => handleDeliveryRequest('urgent')}
                className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-red-600 text-sm font-semibold py-3 rounded-xl hover:border-red-300 hover:bg-red-50 transition">
                <AlertTriangle className="w-4 h-4" />
                Urgent Request
              </button>
            </>
          )}
          <button onClick={handleGenerateInvoice} disabled={generating || order.base_price === 0}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition col-span-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {order.base_price === 0 ? 'Set price to generate invoice' : 'Download Invoice PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
