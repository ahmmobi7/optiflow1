import { requireAuth } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import InvoicesClient from './InvoicesClient';
import type { Invoice } from '@/types';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const profile = await requireAuth();
  const supabase = createServerClient();

  let query = supabase
    .from('invoices')
    .select('*, orders(order_number, customer_name, status, frame_type, lens_type), profiles!invoices_optician_id_fkey(shop_name, owner_name)')
    .order('created_at', { ascending: false });

  if (profile.role === 'optician') query = query.eq('optician_id', profile.id);

  const { data: invoicesRaw } = await query;

  return (
    <AppShell profile={profile}>
      <InvoicesClient invoices={(invoicesRaw ?? []) as unknown as Invoice[]} profile={profile} />
    </AppShell>
  );
}
