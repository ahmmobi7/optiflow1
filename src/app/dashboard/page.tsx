import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import DashboardClient from './DashboardClient';
import type { Profile, Order } from '@/types';

export const dynamic = 'force-dynamic';


export default async function DashboardPage() {
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
  if (profile.role === 'admin') redirect('/admin');
  if (profile.role === 'technician') redirect('/technician');

  const { data: ordersRaw } = await supabase
    .from('orders')
    .select('*')
    .eq('optician_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const orders = (ordersRaw ?? []) as unknown as Order[];

  const { count: totalOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('optician_id', session.user.id);

  const { count: activeOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('optician_id', session.user.id)
    .neq('status', 'delivered');

  const { count: readyOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('optician_id', session.user.id)
    .eq('status', 'ready_for_delivery');

  const { data: unreadRaw } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('is_read', false);

  return (
    <AppShell profile={profile} notificationCount={unreadRaw?.length ?? 0}>
      <DashboardClient
        profile={profile}
        recentOrders={orders}
        stats={{
          total: totalOrders ?? 0,
          active: activeOrders ?? 0,
          ready: readyOrders ?? 0,
        }}
      />
    </AppShell>
  );
}
