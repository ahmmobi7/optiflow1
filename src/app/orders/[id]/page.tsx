import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import OrderDetailClient from './OrderDetailClient';
import type { Order, OrderStatusHistory } from '@/types';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const profile = await requireAuth();
  const supabase = createServerClient();

  const { data: orderRaw } = await supabase
    .from('orders')
    .select(`*, profiles!orders_optician_id_fkey(id, shop_name, owner_name, phone, email, gst_number), technician:profiles!orders_assigned_technician_id_fkey(id, owner_name, email), invoices(*)`)
    .eq('id', params.id)
    .single();

  if (!orderRaw) notFound();

  const order = orderRaw as unknown as Order;
  if (profile.role === 'optician' && order.optician_id !== profile.id) notFound();

  const { data: historyRaw } = await supabase
    .from('order_status_history')
    .select('*, profiles(owner_name, email)')
    .eq('order_id', params.id)
    .order('created_at', { ascending: false });

  return (
    <AppShell profile={profile}>
      <OrderDetailClient order={order} history={(historyRaw ?? []) as unknown as OrderStatusHistory[]} profile={profile} />
    </AppShell>
  );
}
