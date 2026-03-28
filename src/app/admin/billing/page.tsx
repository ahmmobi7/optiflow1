import { requireRole } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import BillingClient from './BillingClient';
import type { Invoice } from '@/types';

export const dynamic = 'force-dynamic';

export default async function AdminBillingPage() {
  const profile = await requireRole(['admin']);
  const supabase = createServerClient();

  const { data: invoicesRaw } = await supabase
    .from('invoices')
    .select('*, orders(order_number, customer_name, frame_type, lens_type, base_price), profiles!invoices_optician_id_fkey(shop_name, owner_name, phone)')
    .order('created_at', { ascending: false });

  return (
    <AppShell profile={profile}>
      <BillingClient invoices={(invoicesRaw ?? []) as unknown as Invoice[]} profile={profile} />
    </AppShell>
  );
}
