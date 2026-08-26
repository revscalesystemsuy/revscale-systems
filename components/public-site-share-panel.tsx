"use client";

import { useState } from "react";
import { Check, Copy, QrCode, Share2 } from "lucide-react";

export function PublicSiteSharePanel({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const qrUrl = `https://quickchart.io/qr?size=220&margin=2&text=${encodeURIComponent(url)}`;

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({ title: "Propiedades", text: "Mirá nuestro catálogo de propiedades", url });
      return;
    }
    await copyLink();
  }

  return (
    <section className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5 md:p-6">
      <div className="flex items-center gap-2 text-[#5f513e]"><Share2 size={17}/><h2 className="font-serif text-2xl text-[#302b25]">Compartir el sitio</h2></div>
      <p className="mt-2 break-all text-xs leading-5 text-[#716a61]">{url}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={copyLink} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-3 text-sm font-semibold text-[#5f513e]">{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "Copiado" : "Copiar enlace"}</button>
        <button type="button" onClick={shareLink} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#302d28] px-4 py-3 text-sm font-semibold text-[#fffaf2]"><Share2 size={15}/> Compartir</button>
      </div>
      <div className="mt-5 flex items-center gap-4 rounded-xl border border-[#ded2c1] bg-[#fffaf2] p-4">
        <div role="img" aria-label="Código QR del sitio público" className="h-28 w-28 shrink-0 rounded-lg border border-[#ded2c1] bg-white bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${qrUrl})` }}/>
        <div><p className="flex items-center gap-2 text-sm font-semibold"><QrCode size={16}/> Código QR</p><p className="mt-2 text-xs leading-5 text-[#81786d]">Ideal para vidriera, cartelería, flyers, firma de email o redes. El QR abre únicamente el sitio de esta inmobiliaria.</p></div>
      </div>
    </section>
  );
}
