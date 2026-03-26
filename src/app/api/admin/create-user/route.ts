import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Verify the requester is an admin
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, password, owner_name, role } = await req.json();

    if (!email || !password || !owner_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use service role to create user
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: newUser, error: createError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification for staff
      user_metadata: { role },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Update the profile with name and role
    const { data: profileData, error: profileError } = await serviceSupabase
      .from('profiles')
      .update({ owner_name, role, is_active: true })
      .eq('id', newUser.user.id)
      .select()
      .single();

    if (profileError) {
      // Profile auto-created by trigger, update might need retry
      const { data: retryProfile } = await serviceSupabase
        .from('profiles')
        .upsert({ id: newUser.user.id, email, owner_name, role, is_active: true })
        .select()
        .single();

      return NextResponse.json({ profile: retryProfile });
    }

    return NextResponse.json({ profile: profileData });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
