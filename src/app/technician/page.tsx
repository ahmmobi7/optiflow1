import { requireRole } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import TechnicianClient from './TechnicianClient';
import type { Order } from '@/types';

export const dynamic = 'force-dynamic';

export default async function TechnicianPage() {
  const profile = await requireRole(['technician', 'admin']);
  const supabase = createServerClient();

  const { data: ordersRaw } = await supabase
    .from('orders')
    .select('*, profiles!orders_optician_id_fkey(shop_name, owner_name, phone)')
    .neq('status', 'delivered')
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: true });

  return (
    <AppShell profile={profile}>
      <TechnicianClient orders={(ordersRaw ?? []) as unknown as Order[]} profile={profile} />
    </AppShell>
  );
}
