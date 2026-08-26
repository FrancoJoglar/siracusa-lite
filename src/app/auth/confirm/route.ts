import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  if (!token || !type) {
    return NextResponse.redirect(`${origin}/auth/error?error=missing_token`);
  }

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(`${origin}/auth/error?error=missing_config`);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (type === 'email_change' || type === 'signup' || type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as any,
    });

    if (error) {
      return NextResponse.redirect(`${origin}/auth/error?error=${error.message}`);
    }

    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/#/reset-password?token=${token}`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
