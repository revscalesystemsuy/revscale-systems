import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/inmobiliaria/", "/p/"],
        disallow: ["/protected/", "/auth/", "/demo/", "/request"],
      },
    ],
    sitemap: "https://revscale-systems-eta.vercel.app/sitemap.xml",
  };
}
