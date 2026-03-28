import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import DashboardClient from './DashboardClient';
import type { Order } from '@/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const profile = await requireAuth();
  if (profile.role === 'admin') redirect('/admin');
  if (profile.role === 'technician') redirect('/technician');

  const supabase = createServerClient();

  const { data: ordersRaw } = await supabase
    .from('orders').select('*')
    .eq('optician_id', profile.id)
    .order('created_at', { ascending: false }).limit(5);

  const { count: totalOrders } = await supabase
    .from('orders').select('id', { count: 'exact', head: true })
    .eq('optician_id', profile.id);

  const { count: activeOrders } = await supabase
    .from('orders').select('id', { count: 'exact', head: true })
    .eq('optician_id', profile.id).neq('status', 'delivered');

  const { count: readyOrders } = await supabase
    .from('orders').select('id', { count: 'exact', head: true })
    .eq('optician_id', profile.id).eq('status', 'ready_for_delivery');

  const { data: unread } = await supabase
    .from('notifications').select('id')
    .eq('user_id', profile.id).eq('is_read', false);

  return (
    <AppShell profile={profile} notificationCount={unread?.length ?? 0}>
      <DashboardClient
        profile={profile}
        recentOrders={(ordersRaw ?? []) as unknown as Order[]}
        stats={{ total: totalOrders ?? 0, active: activeOrders ?? 0, ready: readyOrders ?? 0 }}
      />
    </AppShell>
  );
}
