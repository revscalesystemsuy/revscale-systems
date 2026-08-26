import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";

async function resolveCustomDomain(hostname: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !hostname || hostname.includes("vercel.app") || hostname === "localhost") return null;
  try {
    const endpoint = `${url}/rest/v1/brokerage_public_sites?select=site_slug&custom_domain=eq.${encodeURIComponent(hostname)}&custom_domain_status=eq.ACTIVE&is_active=eq.true&limit=1`;
    const response = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 60 } });
    if (!response.ok) return null;
    const rows = await response.json() as Array<{ site_slug: string }>;
    return rows[0]?.site_slug || null;
  } catch { return null; }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/offline" ||
    pathname.startsWith("/pwa/")
  ) {
    return NextResponse.next();
  }

  const hostname = (request.headers.get("host") || request.nextUrl.hostname).split(":")[0].toLowerCase();
  const siteSlug = await resolveCustomDomain(hostname);
  if (siteSlug && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/inmobiliaria/${siteSlug}`;
    return NextResponse.rewrite(url);
  }
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
