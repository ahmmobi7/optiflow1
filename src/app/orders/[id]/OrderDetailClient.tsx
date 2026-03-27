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
  ChevronLeft, AlertTriangle, Truck,
  Download, Clock, CheckCircle2, Loader2,
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
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-lg">URGENT</span>
            )}
            <StatusBadge status={order.status} size="sm" />
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 space-y-4 pb-8">
        <Section title="Job Progress">
          <StatusSteps status={order.status} />
        </Section>

        {/* ✅ FIXED SECTION */}
        <Section title="Prescription">
          <div className="grid grid-cols-2 gap-4">
            {(['RE', 'LE'] as const).map(side => {
              const eyeData =
                side === 'RE'
                  ? {
                      sph: order.re_sph,
                      cyl: order.re_cyl,
                      axis: order.re_axis,
                      add: order.re_add,
                    }
                  : {
                      sph: order.le_sph,
                      cyl: order.le_cyl,
                      axis: order.le_axis,
                      add: order.le_add,
                    };

              return (
                <div key={side}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${side === 'RE' ? 'bg-blue-500' : 'bg-violet-500'}`}>
                      <span className="text-white text-xs font-bold">{side === 'RE' ? 'R' : 'L'}</span>
                    </div>
                    <span className="font-semibold text-sm text-slate-700">
                      {side === 'RE' ? 'Right Eye' : 'Left Eye'}
                    </span>
                  </div>

                  {[
                    ['SPH', eyeData.sph],
                    ['CYL', eyeData.cyl],
                    ['AXIS', eyeData.axis],
                    ['ADD', eyeData.add],
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

        {/* Rest of your file remains unchanged */}
      </div>
    </div>
  );
}