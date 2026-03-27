import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import AdminOrdersClient from './AdminOrdersClient';
import type { Profile, Order } from '@/types';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; urgent?: string };
}) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profileRaw } = await supabase
    .from('profiles').select('*').eq('id', session.user.id).single();
  if (!profileRaw) redirect('/login');
  const profile = profileRaw as unknown as Profile;
  if (profile.role !== 'admin') redirect('/dashboard');

  let query = supabase
    .from('orders')
    .select('*, profiles!orders_optician_id_fkey(shop_name, owner_name, phone), technician:profiles!orders_assigned_technician_id_fkey(owner_name)')
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: false });

  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.urgent === 'true') {
    query = query.eq('is_urgent', true).neq('status', 'delivered');
  }

  const { data: ordersRaw } = await query;
  const orders = (ordersRaw ?? []) as unknown as Order[];

  const { data: techsRaw } = await supabase
    .from('profiles')
    .select('id, owner_name, email')
    .eq('role', 'technician')
    .eq('is_active', true);

  const technicians = (techsRaw ?? []) as { id: string; owner_name: string | null; email: string }[];

  return (
    <AppShell profile={profile}>
      <AdminOrdersClient orders={orders} technicians={technicians} profile={profile} />
    </AppShell>
  );
}
