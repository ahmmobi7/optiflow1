import { redirect, notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import OrderDetailClient from './OrderDetailClient';
import type { Profile, Order, OrderStatusHistory } from '@/types';

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profileRaw) redirect('/login');
  const profile = profileRaw as unknown as Profile;

  const { data: orderRaw } = await supabase
    .from('orders')
    .select(`
      *,
      profiles!orders_optician_id_fkey(id, shop_name, owner_name, phone, email, gst_number),
      technician:profiles!orders_assigned_technician_id_fkey(id, owner_name, email),
      invoices(*)
    `)
    .eq('id', params.id)
    .single();

  if (!orderRaw) notFound();

  const order = orderRaw as unknown as Order;

  if (profile.role === 'optician' && order.optician_id !== session.user.id) notFound();

  const { data: historyRaw } = await supabase
    .from('order_status_history')
    .select('*, profiles(owner_name, email)')
    .eq('order_id', params.id)
    .order('created_at', { ascending: false });

  const history = (historyRaw ?? []) as unknown as OrderStatusHistory[];

  return (
    <AppShell profile={profile}>
      <OrderDetailClient order={order} history={history} profile={profile} />
    </AppShell>
  );
}
