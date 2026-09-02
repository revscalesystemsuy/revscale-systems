"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function PublicSiteInquiryForm({ siteSlug, propertySlug, propertyTitle }: { siteSlug: string; propertySlug?: string | null; propertyTitle?: string | null }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);

  async function submit(formData: FormData) {
    setState("sending"); setError("");
    const phone = String(formData.get("phone") || "").trim();
    const email = String(formData.get("email") || "").trim();

    if (!phone && !email) {
      setError("Ingresá al menos un teléfono o un email.");
      setState("error");
      return;
    }
    if (!privacyAccepted) {
      setError("Para enviar la consulta tenés que aceptar el tratamiento de tus datos para responderla.");
      setState("error");
      return;
    }
    if (whatsappOptIn && !phone) {
      setError("Para autorizar contacto por WhatsApp ingresá un número de teléfono.");
      setState("error");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("submit_public_site_inquiry_v2", {
      p_site_slug: siteSlug,
      p_property_slug: propertySlug || null,
      p_full_name: String(formData.get("name") || ""),
      p_phone: phone,
      p_email: email,
      p_message: String(formData.get("message") || ""),
      p_utm_source: params.get("utm_source"), p_utm_medium: params.get("utm_medium"), p_utm_campaign: params.get("utm_campaign"), p_utm_content: params.get("utm_content"),
      p_referrer: document.referrer || null, p_page_path: window.location.pathname, p_honeypot: String(formData.get("company") || ""),
      p_privacy_accepted: privacyAccepted,
      p_whatsapp_opt_in: whatsappOptIn,
    });
    if (rpcError) { setError("No pudimos enviar la consulta. Probá nuevamente o contactá por otro canal."); setState("error"); return; }
    setState("sent");
  }

  if (state === "sent") return <div className="rounded-2xl border border-[#bcc4ad] bg-[#edf0e7] p-6 text-[#46503c]"><CheckCircle2 size={22}/><p className="mt-3 font-serif text-2xl">Consulta enviada</p><p className="mt-2 text-sm">La inmobiliaria ya recibió tus datos en su equipo comercial.</p></div>;

  return <form action={submit} className="space-y-3">
    <div className="hidden" aria-hidden="true"><label>Empresa<input name="company" tabIndex={-1} autoComplete="off"/></label></div>
    <input name="name" required minLength={2} maxLength={120} placeholder="Nombre y apellido" className="w-full rounded-lg border border-[#d2c5b3] bg-[#fffaf2] px-4 py-3 text-sm outline-none focus:border-[#8d7553]" />
    <div className="grid gap-3 sm:grid-cols-2"><input name="phone" maxLength={40} placeholder="WhatsApp / teléfono" className="rounded-lg border border-[#d2c5b3] bg-[#fffaf2] px-4 py-3 text-sm outline-none focus:border-[#8d7553]"/><input name="email" type="email" maxLength={180} placeholder="Email" className="rounded-lg border border-[#d2c5b3] bg-[#fffaf2] px-4 py-3 text-sm outline-none focus:border-[#8d7553]"/></div>
    <textarea name="message" maxLength={2000} rows={4} defaultValue={propertyTitle ? `Hola, me interesa ${propertyTitle}.` : "Hola, quiero recibir información sobre propiedades."} className="w-full resize-none rounded-lg border border-[#d2c5b3] bg-[#fffaf2] px-4 py-3 text-sm leading-6 outline-none focus:border-[#8d7553]"/>

    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-3 text-[11px] leading-5 text-[#6f685f]">
      <input type="checkbox" required checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#302d28]" />
      <span>Acepto que esta inmobiliaria trate mis datos para responder la consulta y que RevScale Systems los procese como proveedor tecnológico conforme a la <Link href="/privacy" target="_blank" className="font-semibold underline underline-offset-2">Política de privacidad</Link>.</span>
    </label>

    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-3 text-[11px] leading-5 text-[#6f685f]">
      <input type="checkbox" checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#302d28]" />
      <span>Opcional: acepto recibir mensajes por WhatsApp de esta inmobiliaria relacionados con esta consulta y propiedades relacionadas. Puedo retirar este consentimiento en cualquier momento.</span>
    </label>

    <p className="text-[11px] leading-5 text-[#81786d]">Completá al menos teléfono o email. La consulta queda asociada únicamente a esta inmobiliaria dentro de RevScale.</p>
    {error && <p className="text-xs font-medium text-[#8a4d42]">{error}</p>}
    <button disabled={state === "sending"} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2] disabled:opacity-60"><Send size={15}/>{state === "sending" ? "Enviando…" : "Enviar consulta"}</button>
  </form>;
}
