import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import AdminDashboardClient from './AdminDashboardClient';
import type { Profile, Order } from '@/types';

export default async function AdminPage() {
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
  if (profile.role !== 'admin') redirect('/dashboard');

  const { count: totalOrders } = await supabase
    .from('orders').select('id', { count: 'exact', head: true });
  const { count: activeOrders } = await supabase
    .from('orders').select('id', { count: 'exact', head: true })
    .neq('status', 'delivered');
  const { count: urgentOrders } = await supabase
    .from('orders').select('id', { count: 'exact', head: true })
    .eq('is_urgent', true).neq('status', 'delivered');
  const { count: totalOpticians } = await supabase
    .from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'optician');
  const { count: totalTechnicians } = await supabase
    .from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'technician');

  const { data: revenueRaw } = await supabase
    .from('invoices').select('total_amount, status');
  const revenueList = (revenueRaw ?? []) as { total_amount: number; status: string }[];
  const totalRevenue = revenueList.reduce((s, i) => s + i.total_amount, 0);
  const paidRevenue = revenueList
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + i.total_amount, 0);

  const { data: recentRaw } = await supabase
    .from('orders')
    .select('*, profiles!orders_optician_id_fkey(shop_name, owner_name)')
    .order('created_at', { ascending: false })
    .limit(10);

  const recentOrders = (recentRaw ?? []) as unknown as Order[];

  return (
    <AppShell profile={profile}>
      <AdminDashboardClient
        profile={profile}
        stats={{
          totalOrders: totalOrders ?? 0,
          activeOrders: activeOrders ?? 0,
          urgentOrders: urgentOrders ?? 0,
          totalOpticians: totalOpticians ?? 0,
          totalTechnicians: totalTechnicians ?? 0,
          totalRevenue,
          paidRevenue,
        }}
        recentOrders={recentOrders}
      />
    </AppShell>
  );
}
