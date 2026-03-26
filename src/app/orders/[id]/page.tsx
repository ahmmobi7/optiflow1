import { redirect, notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import OrderDetailClient from './OrderDetailClient';

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (!profile) redirect('/login');

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      profiles!orders_optician_id_fkey(id, shop_name, owner_name, phone, email, gst_number),
      technician:profiles!orders_assigned_technician_id_fkey(id, owner_name, email),
      invoices(*)
    `)
    .eq('id', params.id)
    .single();

  if (!order) notFound();

  // Check access: opticians can only see their own
  if (profile.role === 'optician' && order.optician_id !== session.user.id) notFound();

  const { data: history } = await supabase
    .from('order_status_history')
    .select('*, profiles(owner_name, email)')
    .eq('order_id', params.id)
    .order('created_at', { ascending: false });

  return (
    <AppShell profile={profile}>
      <OrderDetailClient order={order} history={history || []} profile={profile} />
    </AppShell>
  );
}
