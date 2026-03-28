import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import type { Profile } from '@/types';

export const dynamic = 'force-dynamic';

// This page is only ever reached when a logged-in user hits /login or /register.
// It reads their role and sends them to the correct dashboard.
export default async function AuthRedirectPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const role = (profileRaw as unknown as Pick<Profile, 'role'> | null)?.role;

  if (role === 'admin') redirect('/admin');
  if (role === 'technician') redirect('/technician');
  redirect('/dashboard');
}
