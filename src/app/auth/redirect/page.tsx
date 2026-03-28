import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AuthRedirectPage() {
  const profile = await requireAuth();
  if (profile.role === 'admin') redirect('/admin');
  if (profile.role === 'technician') redirect('/technician');
  redirect('/dashboard');
}
