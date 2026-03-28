import { createServerClient } from './supabase-server';
import { redirect } from 'next/navigation';
import type { Profile } from '@/types';

/**
 * Call this at the top of every protected Server Component page.
 * - Redirects to /login if not authenticated.
 * - If profile row is missing (e.g. admin created via Supabase dashboard),
 *   it creates a default profile so the app never loops.
 * - Returns the typed Profile.
 */
export async function requireAuth(): Promise<Profile> {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profileRaw) {
    return profileRaw as unknown as Profile;
  }

  // Profile row missing — upsert a default one so the app doesn't loop
  const defaultProfile = {
    id: session.user.id,
    email: session.user.email ?? '',
    role: (session.user.user_metadata?.role as string) ?? 'optician',
    shop_name: null,
    owner_name: null,
    phone: null,
    address: null,
    gst_number: null,
    is_active: true,
  };

  await supabase.from('profiles').upsert(defaultProfile);

  return defaultProfile as Profile;
}

/**
 * Like requireAuth but also checks the role.
 * Redirects to /dashboard if the role doesn't match.
 */
export async function requireRole(allowedRoles: Profile['role'][]): Promise<Profile> {
  const profile = await requireAuth();
  if (!allowedRoles.includes(profile.role)) redirect('/dashboard');
  return profile;
}
