import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/auth/login?confirmed=1";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const redirectTo = new URL(next, url.origin);

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(redirectTo);

    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) return NextResponse.redirect(redirectTo);

    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  // Confirmation links generated with Supabase's default ConfirmationURL are
  // verified by Supabase before redirecting back to the application. In that
  // flow there is intentionally no token/code left for this route to exchange.
  // Sending the user to login avoids showing a false confirmation error.
  return NextResponse.redirect(new URL("/auth/login?confirmed=1", url.origin));
}
