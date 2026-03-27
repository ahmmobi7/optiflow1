import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import TechnicianClient from './TechnicianClient';
import type { Profile, Order } from '@/types';

export default async function TechnicianPage() {
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
  if (profile.role !== 'technician' && profile.role !== 'admin') redirect('/dashboard');

  const { data: ordersRaw } = await supabase
    .from('orders')
    .select('*, profiles!orders_optician_id_fkey(shop_name, owner_name, phone)')
    .neq('status', 'delivered')
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: true });

  const orders = (ordersRaw ?? []) as unknown as Order[];

  return (
    <AppShell profile={profile}>
      <TechnicianClient orders={orders} profile={profile} />
    </AppShell>
  );
}
