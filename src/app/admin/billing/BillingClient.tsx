'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Invoice, Profile } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { generatePDF } from '@/lib/pdf';
import {
  FileText, Download, TrendingUp, CheckCircle2,
  AlertCircle, Loader2, DollarSign, Search,
} from 'lucide-react';

interface BillingClientProps {
  invoices: Invoice[];
  profile: Profile;
}

export default function BillingClient({ invoices: initialInvoices }: BillingClientProps) {
  const supabase = createClient();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const totalRevenue = invoices.reduce((s, i) => s + i.total_amount, 0);
  const paidRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + i.total_amount, 0);
  const unpaidRevenue = invoices
    .filter(i => i.status === 'unpaid')
    .reduce((s, i) => s + i.total_amount, 0);

  const filtered = invoices.filter(i => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      i.invoice_number.toLowerCase().includes(q) ||
      (i.profiles?.shop_name ?? '').toLowerCase().includes(q) ||
      (i.orders?.customer_name ?? '').toLowerCase().includes(q)
    );
  });

  const handleMarkPaid = async (invoice: Invoice) => {
    setUpdating(invoice.id);
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_amount: invoice.total_amount,
        payment_date: new Date().toISOString(),
      })
      .eq('id', invoice.id);

    if (error) {
      toast.error('Failed to update');
    } else {
      setInvoices(prev =>
        prev.map(i =>
          i.id === invoice.id
            ? { ...i, status: 'paid' as const, paid_amount: i.total_amount }
            : i
        )
      );
      toast.success('Marked as paid!');
    }
    setUpdating(null);
  };

  const handleDownload = async (invoice: Invoice) => {
    if (!invoice.orders) {
      toast.error('Order data missing');
      return;
    }
    setDownloading(invoice.id);
    try {
      const orderData = {
        ...invoice.orders,
        optician_id: invoice.optician_id,
        profiles: invoice.profiles,
        created_at: invoice.created_at,
      };
      await generatePDF(orderData, invoice);
      toast.success('Downloaded!');
    } catch {
      toast.error('Download failed');
    }
    setDownloading(null);
  };

  const StatusPill = ({ status }: { status: Invoice['status'] }) => {
    const styles: Record<Invoice['status'], string> = {
      paid: 'bg-green-100 text-green-700',
      unpaid: 'bg-red-100 text-red-700',
      partial: 'bg-amber-100 text-amber-700',
    };
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 py-4 lg:px-8">
        <h1 className="text-xl font-bold text-slate-900">Billing &amp; Invoices</h1>
        <p className="text-slate-400 text-xs mt-0.5">{invoices.length} invoices</p>
      </div>

      <div className="p-4 lg:p-8 space-y-5">
        {/* Revenue summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white">
            <TrendingUp className="w-4 h-4 opacity-70 mb-2" />
            <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-blue-200 text-xs mt-0.5">Total Billed</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-green-500 mb-2" />
            <p className="text-xl font-bold text-green-700">{formatCurrency(paidRevenue)}</p>
            <p className="text-slate-400 text-xs mt-0.5">Collected</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <AlertCircle className="w-4 h-4 text-red-500 mb-2" />
            <p className="text-xl font-bold text-red-600">{formatCurrency(unpaidRevenue)}</p>
            <p className="text-slate-400 text-xs mt-0.5">Pending</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoices, shops..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-400 transition"
          />
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-900">No invoices found</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(invoice => (
              <div
                key={invoice.id}
                className="bg-white rounded-2xl border border-slate-100 hover:border-blue-100 transition p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">
                        {invoice.invoice_number}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {invoice.profiles?.shop_name ?? invoice.profiles?.owner_name ?? 'Unknown'}
                      </p>
                      {invoice.orders && (
                        <p className="text-xs text-slate-400">
                          {invoice.orders.order_number} · {invoice.orders.customer_name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusPill status={invoice.status} />
                        <span className="text-xs text-slate-300">
                          {formatDate(invoice.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right space-y-2">
                    <p className="font-bold text-slate-900">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                    <div className="flex items-center gap-1.5 justify-end">
                      {invoice.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkPaid(invoice)}
                          disabled={updating === invoice.id}
                          className="flex items-center gap-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 font-semibold px-2 py-1 rounded-lg transition"
                        >
                          {updating === invoice.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <DollarSign className="w-3 h-3" />}
                          Paid
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(invoice)}
                        disabled={downloading === invoice.id}
                        className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium px-2 py-1 rounded-lg transition"
                      >
                        {downloading === invoice.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Download className="w-3 h-3" />}
                        PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
