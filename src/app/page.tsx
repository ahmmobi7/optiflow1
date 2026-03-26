import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';

export default async function RootPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role === 'admin') redirect('/admin');
  if (profile?.role === 'technician') redirect('/technician');
  redirect('/dashboard');
}
