import type { Metadata } from "next";
import { SeoLanding } from "@/components/marketing/seo-landing";
import { seoPages } from "@/lib/marketing/seo-pages";

const page = seoPages["software-inmobiliario"];
export const metadata: Metadata = { title: page.title, description: page.description, alternates: { canonical: "/software-inmobiliario" } };
export default function Page() { return <SeoLanding page={page} />; }
