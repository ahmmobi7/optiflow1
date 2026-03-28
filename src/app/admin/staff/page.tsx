import { requireRole } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import AppShell from '@/components/AppShell';
import StaffClient from './StaffClient';
import type { Profile } from '@/types';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const profile = await requireRole(['admin']);
  const supabase = createServerClient();

  const { data: staffRaw } = await supabase
    .from('profiles').select('*')
    .in('role', ['technician', 'optician'])
    .order('role').order('created_at', { ascending: false });

  return (
    <AppShell profile={profile}>
      <StaffClient staff={(staffRaw ?? []) as unknown as Profile[]} adminProfile={profile} />
    </AppShell>
  );
}
