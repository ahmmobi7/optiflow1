import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profile) redirect('/login');
  if (profile.role === 'admin') redirect('/admin');
  if (profile.role === 'technician') redirect('/technician');

  // Fetch orders summary
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, status, is_urgent, created_at, updated_at, base_price, extra_charges, discount')
    .eq('optician_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const { count: totalOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('optician_id', session.user.id);

  const { count: activeOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('optician_id', session.user.id)
    .not('status', 'in', '("delivered")');

  const { count: readyOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('optician_id', session.user.id)
    .eq('status', 'ready_for_delivery');

  const { data: unreadNotifications } = await supabase
    .from('notifications')
    .select('id', { count: 'exact' })
    .eq('user_id', session.user.id)
    .eq('is_read', false);

  return (
    <AppShell profile={profile} notificationCount={unreadNotifications?.length || 0}>
      <DashboardClient
        profile={profile}
        recentOrders={orders || []}
        stats={{ total: totalOrders || 0, active: activeOrders || 0, ready: readyOrders || 0 }}
      />
    </AppShell>
  );
}
