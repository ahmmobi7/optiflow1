import { createServerClient } from './supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import type { Profile } from '@/types';

function serviceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function requireAuth(): Promise<Profile> {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Use service client to read profile — avoids any RLS recursion issues on server
  const { data: profile } = await serviceClient()
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profile) return profile as Profile;

  // Profile row missing — create via service client (no RLS)
  const role = (session.user.user_metadata?.role as string) ?? 'optician';
  const newProfile = {
    id: session.user.id,
    email: session.user.email ?? '',
    role,
    shop_name: null as string | null,
    owner_name: null as string | null,
    phone: null as string | null,
    address: null as string | null,
    gst_number: null as string | null,
    is_active: true,
  };
  await serviceClient().from('profiles').upsert(newProfile);
  return newProfile as Profile;
}

export async function requireRole(allowedRoles: Profile['role'][]): Promise<Profile> {
  const profile = await requireAuth();
  if (!allowedRoles.includes(profile.role)) redirect('/dashboard');
  return profile;
}
