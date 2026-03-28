import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import StaffClient from './StaffClient';
import type { Profile } from '@/types';

export const dynamic = 'force-dynamic';


export default async function StaffPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profileRaw } = await supabase
    .from('profiles').select('*').eq('id', session.user.id).single();
  if (!profileRaw) redirect('/login');
  const profile = profileRaw as unknown as Profile;
  if (profile.role !== 'admin') redirect('/dashboard');

  const { data: staffRaw } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['technician', 'optician'])
    .order('role')
    .order('created_at', { ascending: false });

  const staff = (staffRaw ?? []) as unknown as Profile[];

  return (
    <AppShell profile={profile}>
      <StaffClient staff={staff} adminProfile={profile} />
    </AppShell>
  );
}
