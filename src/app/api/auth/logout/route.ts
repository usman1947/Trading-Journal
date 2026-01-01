import { clearAuthCookie } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST() {
  return clearAuthCookie();
}
