"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function PublicSiteInquiryForm({ siteSlug, propertySlug, propertyTitle }: { siteSlug: string; propertySlug?: string | null; propertyTitle?: string | null }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setState("sending"); setError("");
    const params = new URLSearchParams(window.location.search);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("submit_public_site_inquiry", {
      p_site_slug: siteSlug,
      p_property_slug: propertySlug || null,
      p_full_name: String(formData.get("name") || ""),
      p_phone: String(formData.get("phone") || ""),
      p_email: String(formData.get("email") || ""),
      p_message: String(formData.get("message") || ""),
      p_utm_source: params.get("utm_source"), p_utm_medium: params.get("utm_medium"), p_utm_campaign: params.get("utm_campaign"), p_utm_content: params.get("utm_content"),
      p_referrer: document.referrer || null, p_page_path: window.location.pathname, p_honeypot: String(formData.get("company") || ""),
    });
    if (rpcError) { setError("No pudimos enviar la consulta. Probá nuevamente o contactá por WhatsApp."); setState("error"); return; }
    setState("sent");
  }

  if (state === "sent") return <div className="rounded-2xl border border-[#bcc4ad] bg-[#edf0e7] p-6 text-[#46503c]"><CheckCircle2 size={22}/><p className="mt-3 font-serif text-2xl">Consulta enviada</p><p className="mt-2 text-sm">La inmobiliaria ya recibió tus datos en su equipo comercial.</p></div>;

  return <form action={submit} className="space-y-3">
    <div className="hidden" aria-hidden="true"><label>Empresa<input name="company" tabIndex={-1} autoComplete="off"/></label></div>
    <input name="name" required minLength={2} maxLength={120} placeholder="Nombre y apellido" className="w-full rounded-lg border border-[#d2c5b3] bg-[#fffaf2] px-4 py-3 text-sm outline-none focus:border-[#8d7553]" />
    <div className="grid gap-3 sm:grid-cols-2"><input name="phone" maxLength={40} placeholder="WhatsApp / teléfono" className="rounded-lg border border-[#d2c5b3] bg-[#fffaf2] px-4 py-3 text-sm outline-none focus:border-[#8d7553]"/><input name="email" type="email" maxLength={180} placeholder="Email" className="rounded-lg border border-[#d2c5b3] bg-[#fffaf2] px-4 py-3 text-sm outline-none focus:border-[#8d7553]"/></div>
    <textarea name="message" maxLength={2000} rows={4} defaultValue={propertyTitle ? `Hola, me interesa ${propertyTitle}.` : "Hola, quiero recibir información sobre propiedades."} className="w-full resize-none rounded-lg border border-[#d2c5b3] bg-[#fffaf2] px-4 py-3 text-sm leading-6 outline-none focus:border-[#8d7553]"/>
    <p className="text-[11px] leading-5 text-[#81786d]">Completá al menos teléfono o email. Tus datos se envían únicamente a esta inmobiliaria.</p>
    {error && <p className="text-xs font-medium text-[#8a4d42]">{error}</p>}
    <button disabled={state === "sending"} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2] disabled:opacity-60"><Send size={15}/>{state === "sending" ? "Enviando…" : "Enviar consulta"}</button>
  </form>;
}
