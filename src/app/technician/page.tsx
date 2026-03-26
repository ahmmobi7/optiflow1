import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import TechnicianClient from './TechnicianClient';

export default async function TechnicianPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile) redirect('/login');
  if (profile.role !== 'technician' && profile.role !== 'admin') redirect('/dashboard');

  const { data: orders } = await supabase
    .from('orders')
    .select('*, profiles!orders_optician_id_fkey(shop_name, owner_name, phone)')
    .not('status', 'eq', 'delivered')
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: true });

  return (
    <AppShell profile={profile}>
      <TechnicianClient orders={orders || []} profile={profile} />
    </AppShell>
  );
}
