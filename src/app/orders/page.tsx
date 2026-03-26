import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import OrdersClient from './OrdersClient';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string };
}) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profile) redirect('/login');

  let query = supabase
    .from('orders')
    .select('*, profiles!orders_optician_id_fkey(shop_name, owner_name)')
    .order('created_at', { ascending: false });

  // Opticians only see their own orders
  if (profile.role === 'optician') {
    query = query.eq('optician_id', session.user.id);
  }

  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }

  const { data: orders } = await query;

  return (
    <AppShell profile={profile}>
      <OrdersClient
        profile={profile}
        orders={orders || []}
        initialStatus={searchParams.status}
      />
    </AppShell>
  );
}
