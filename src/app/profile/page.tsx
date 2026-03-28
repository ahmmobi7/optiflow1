import { requireAuth } from '@/lib/auth';
import AppShell from '@/components/AppShell';
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const profile = await requireAuth();
  return (
    <AppShell profile={profile}>
      <ProfileClient profile={profile} />
    </AppShell>
  );
}
