import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import StaffClient from './StaffClient';

export default async function StaffPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  const { data: staff } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['technician', 'optician'])
    .order('role')
    .order('created_at', { ascending: false });

  return (
    <AppShell profile={profile}>
      <StaffClient staff={staff || []} adminProfile={profile} />
    </AppShell>
  );
}
