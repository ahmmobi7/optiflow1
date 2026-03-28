import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import InvoicesClient from './InvoicesClient';
import type { Profile, Invoice } from '@/types';

export const dynamic = 'force-dynamic';


export default async function InvoicesPage() {
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

  let query = supabase
    .from('invoices')
    .select('*, orders(order_number, customer_name, status, frame_type, lens_type), profiles!invoices_optician_id_fkey(shop_name, owner_name)')
    .order('created_at', { ascending: false });

  if (profile.role === 'optician') {
    query = query.eq('optician_id', session.user.id);
  }

  const { data: invoicesRaw } = await query;
  const invoices = (invoicesRaw ?? []) as unknown as Invoice[];

  return (
    <AppShell profile={profile}>
      <InvoicesClient invoices={invoices} profile={profile} />
    </AppShell>
  );
}
