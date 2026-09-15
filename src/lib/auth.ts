import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const DEMO_COOKIE = 'nexus_demo';

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function resolveUser(): Promise<{ id: string; isDemo: boolean } | null> {
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_COOKIE)?.value === '1') {
    return { id: DEMO_USER_ID, isDemo: true };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id, isDemo: false } : null;
}