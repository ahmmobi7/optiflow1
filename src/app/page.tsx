import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import type { Profile } from '@/types';

export default async function RootPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const profile = profileRaw as unknown as Pick<Profile, 'role'> | null;

  if (profile?.role === 'admin') redirect('/admin');
  if (profile?.role === 'technician') redirect('/technician');
  redirect('/dashboard');
}
