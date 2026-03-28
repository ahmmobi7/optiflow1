import { requireAuth } from '@/lib/auth';
import AppShell from '@/components/AppShell';
import NewOrderForm from './NewOrderForm';

export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
  const profile = await requireAuth();
  return (
    <AppShell profile={profile}>
      <NewOrderForm profile={profile} />
    </AppShell>
  );
}
