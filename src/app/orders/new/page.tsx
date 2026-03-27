import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import NewOrderForm from './NewOrderForm';
import type { Profile } from '@/types';

export default async function NewOrderPage() {
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

  return (
    <AppShell profile={profile}>
      <NewOrderForm profile={profile} />
    </AppShell>
  );
}
