import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import OrdersClient from './OrdersClient';
import type { Profile, Order } from '@/types';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
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

  let query = supabase
    .from('orders')
    .select('*, profiles!orders_optician_id_fkey(shop_name, owner_name)')
    .order('created_at', { ascending: false });

  if (profile.role === 'optician') {
    query = query.eq('optician_id', session.user.id);
  }
  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }

  const { data: ordersRaw } = await query;
  const orders = (ordersRaw ?? []) as unknown as Order[];

  return (
    <AppShell profile={profile}>
      <OrdersClient
        profile={profile}
        orders={orders}
        initialStatus={searchParams.status}
      />
    </AppShell>
  );
}
