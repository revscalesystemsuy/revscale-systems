import type { MetadataRoute } from "next";

const ORIGIN = "https://revscale-systems-eta.vercel.app";

type PublicSite = { organization_id: string; site_slug: string; custom_domain: string | null; custom_domain_status: string; updated_at: string };
type PublicListing = { organization_id: string; public_slug: string; published_at: string | null; last_synced_at: string | null };

async function publicRest<T>(path: string): Promise<T[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return [];
  try {
    const response = await fetch(`${base}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    return await response.json() as T[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [sites, listings] = await Promise.all([
    publicRest<PublicSite>("brokerage_public_sites?select=organization_id,site_slug,custom_domain,custom_domain_status,updated_at&is_active=eq.true"),
    publicRest<PublicListing>("property_publications?select=organization_id,public_slug,published_at,last_synced_at&channel=eq.REVSCALE_WEB&status=eq.PUBLISHED&public_slug=not.is.null"),
  ]);

  const hostedSites = new Map(sites.filter((site) => !(site.custom_domain && site.custom_domain_status === "ACTIVE")).map((site) => [site.organization_id, site]));
  const entries: MetadataRoute.Sitemap = [
    { url: ORIGIN, changeFrequency: "weekly", priority: 0.8 },
    { url: `${ORIGIN}/pricing`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${ORIGIN}/diagnostico`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${ORIGIN}/roi`, changeFrequency: "monthly", priority: 0.5 },
  ];

  for (const site of hostedSites.values()) {
    entries.push({ url: `${ORIGIN}/inmobiliaria/${site.site_slug}`, lastModified: new Date(site.updated_at), changeFrequency: "daily", priority: 0.8 });
  }
  for (const listing of listings) {
    if (!hostedSites.has(listing.organization_id)) continue;
    entries.push({ url: `${ORIGIN}/p/${listing.public_slug}`, lastModified: new Date(listing.last_synced_at || listing.published_at || Date.now()), changeFrequency: "daily", priority: 0.7 });
  }
  return entries;
}
