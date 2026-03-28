import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import BillingClient from './BillingClient';
import type { Profile, Invoice } from '@/types';

export const dynamic = 'force-dynamic';


export default async function AdminBillingPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profileRaw } = await supabase
    .from('profiles').select('*').eq('id', session.user.id).single();
  if (!profileRaw) redirect('/login');
  const profile = profileRaw as unknown as Profile;
  if (profile.role !== 'admin') redirect('/dashboard');

  const { data: invoicesRaw } = await supabase
    .from('invoices')
    .select('*, orders(order_number, customer_name, frame_type, lens_type, base_price), profiles!invoices_optician_id_fkey(shop_name, owner_name, phone)')
    .order('created_at', { ascending: false });

  const invoices = (invoicesRaw ?? []) as unknown as Invoice[];

  return (
    <AppShell profile={profile}>
      <BillingClient invoices={invoices} profile={profile} />
    </AppShell>
  );
}
