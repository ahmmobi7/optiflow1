import { requireRole } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import AdminOrdersClient from './AdminOrdersClient';
import type { Order, Profile } from '@/types';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({ searchParams }: { searchParams: { status?: string; urgent?: string } }) {
  const profile = await requireRole(['admin']);
  const supabase = createServerClient();

  let query = supabase
    .from('orders')
    .select('*, profiles!orders_optician_id_fkey(shop_name, owner_name, phone), technician:profiles!orders_assigned_technician_id_fkey(owner_name)')
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: false });

  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.urgent === 'true') query = query.eq('is_urgent', true).neq('status', 'delivered');

  const { data: ordersRaw } = await query;
  const { data: techsRaw } = await supabase.from('profiles').select('id, owner_name, email').eq('role', 'technician').eq('is_active', true);

  return (
    <AppShell profile={profile}>
      <AdminOrdersClient
        orders={(ordersRaw ?? []) as unknown as Order[]}
        technicians={(techsRaw ?? []) as { id: string; owner_name: string | null; email: string }[]}
        profile={profile}
      />
    </AppShell>
  );
}
