import type { Metadata } from "next";
import { SeoLanding } from "@/components/marketing/seo-landing";
import { seoPages } from "@/lib/marketing/seo-pages";

const page = seoPages["crm-inmobiliario-uruguay"];
export const metadata: Metadata = { title: page.title, description: page.description, alternates: { canonical: "/crm-inmobiliario-uruguay" } };
export default function Page() { return <SeoLanding page={page} />; }
