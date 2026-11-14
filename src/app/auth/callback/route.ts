import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Handles email confirmation & password-recovery links from Supabase.
 * Exchanges the one-time `code` for a session cookie, then redirects to `next`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') || '/pos';
  // Only allow same-origin relative redirects
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//')
    ? nextParam
    : '/pos';

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      'Tautan tidak valid atau sudah kedaluwarsa. Silakan coba lagi.'
    )}`
  );
}
