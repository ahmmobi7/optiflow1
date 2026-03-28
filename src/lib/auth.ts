import { createServerClient } from './supabase-server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import type { Profile } from '@/types';

/** Service-role client — bypasses RLS, server-only */
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Call at the top of every protected Server Component.
 * Returns the typed Profile. Redirects to /login if no session.
 * If profile row is missing, creates it via service role (bypasses RLS).
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

  if (profileRaw) return profileRaw as unknown as Profile;

  // Profile missing — create it via service role (no RLS restriction)
  // Read role from JWT metadata set during signup/admin creation
  const metaRole = (session.user.user_metadata?.role as string) ?? 'optician';
  const defaultProfile = {
    id: session.user.id,
    email: session.user.email ?? '',
    role: metaRole,
    shop_name: null as string | null,
    owner_name: null as string | null,
    phone: null as string | null,
    address: null as string | null,
    gst_number: null as string | null,
    is_active: true,
  };

  const service = getServiceClient();
  await service.from('profiles').upsert(defaultProfile);

  return defaultProfile as Profile;
}

/**
 * Like requireAuth but also enforces role.
 * Redirects to /dashboard if role not allowed.
 */
export async function requireRole(allowedRoles: Profile['role'][]): Promise<Profile> {
  const profile = await requireAuth();
  if (!allowedRoles.includes(profile.role)) redirect('/dashboard');
  return profile;
}
