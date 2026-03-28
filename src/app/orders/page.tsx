import { requireAuth } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import OrdersClient from './OrdersClient';
import type { Order } from '@/types';

export const dynamic = 'force-dynamic';

export default async function OrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  const profile = await requireAuth();
  const supabase = createServerClient();

  let query = supabase
    .from('orders')
    .select('*, profiles!orders_optician_id_fkey(shop_name, owner_name)')
    .order('created_at', { ascending: false });

  if (profile.role === 'optician') query = query.eq('optician_id', profile.id);
  if (searchParams.status) query = query.eq('status', searchParams.status);

  const { data: ordersRaw } = await query;

  return (
    <AppShell profile={profile}>
      <OrdersClient profile={profile} orders={(ordersRaw ?? []) as unknown as Order[]} initialStatus={searchParams.status} />
    </AppShell>
  );
}
