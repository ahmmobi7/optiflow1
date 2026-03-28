'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Invoice, Profile } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { generatePDF } from '@/lib/pdf';
import {
  FileText, Download, TrendingUp, CheckCircle2,
  Clock, AlertCircle, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface InvoicesClientProps {
  invoices: Invoice[];
  profile: Profile;
}

export default function InvoicesClient({ invoices }: InvoicesClientProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + i.total_amount, 0);
  const totalUnpaid = invoices
    .filter(i => i.status === 'unpaid')
    .reduce((s, i) => s + i.total_amount, 0);
  const totalAmount = invoices.reduce((s, i) => s + i.total_amount, 0);

  const handleDownload = async (invoice: Invoice) => {
    if (!invoice.orders) {
      toast.error('Order not found');
      return;
    }
    setDownloading(invoice.id);
    try {
      // Pass a merged object: joined order fields + optician/profile data
      const orderData = {
        ...invoice.orders,
        optician_id: invoice.optician_id,
        profiles: invoice.profiles,
        created_at: invoice.created_at,
      };
      await generatePDF(orderData as Record<string, unknown>, invoice);
      toast.success('Invoice downloaded!');
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
    const icons: Record<Invoice['status'], React.ReactNode> = {
      paid: <CheckCircle2 className="w-3 h-3" />,
      unpaid: <AlertCircle className="w-3 h-3" />,
      partial: <Clock className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status]}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 py-4 lg:px-8">
        <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
        <p className="text-slate-400 text-xs mt-0.5">{invoices.length} invoices total</p>
      </div>

      <div className="p-4 lg:p-8 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <TrendingUp className="w-4 h-4 text-blue-600 mb-2" />
            <p className="text-xl font-bold text-slate-900">{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total Billed</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-green-600 mb-2" />
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Paid</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <AlertCircle className="w-4 h-4 text-red-500 mb-2" />
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalUnpaid)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Unpaid</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-900 mb-1">No invoices yet</p>
            <p className="text-slate-400 text-sm">
              Invoices are generated when orders are completed
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {invoices.map(invoice => (
              <div
                key={invoice.id}
                className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-blue-100 transition"
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
                      {invoice.orders && (
                        <Link
                          href={`/orders/${invoice.order_id}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {invoice.orders.order_number} · {invoice.orders.customer_name}
                        </Link>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusPill status={invoice.status} />
                        <span className="text-xs text-slate-400">
                          {formatDate(invoice.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-900">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                    {invoice.status === 'partial' && (
                      <p className="text-xs text-green-600">
                        {formatCurrency(invoice.paid_amount)} paid
                      </p>
                    )}
                    <button
                      onClick={() => handleDownload(invoice)}
                      disabled={downloading === invoice.id}
                      className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition ml-auto"
                    >
                      {downloading === invoice.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Download className="w-3 h-3" />}
                      PDF
                    </button>
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
