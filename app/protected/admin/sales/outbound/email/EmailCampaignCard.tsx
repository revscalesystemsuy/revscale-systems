"use client";

import { useState } from "react";
import { Check, Clipboard, Mail } from "lucide-react";

type Props = {
  company: string;
  email: string;
  subject: string;
  body: string;
  tier: "A" | "B";
  score: number;
};

export default function EmailCampaignCard({ company, email, subject, body, tier, score }: Props) {
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  async function copy(kind: "subject" | "body", value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <article className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5 shadow-[0_8px_24px_rgba(72,58,40,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#39342e]">{company}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#776f65]"><Mail size={13}/>{email}</p>
        </div>
        <span className="rounded-full border border-[#b9aa94] bg-[#efe5d6] px-2.5 py-1 text-[10px] font-semibold text-[#665642]">Tier {tier} · {score}/100</span>
      </div>

      <div className="mt-5 rounded-xl border border-[#d8cbb8] bg-[#f7f0e6] p-4">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">Asunto · Día 1</p><p className="mt-1 text-sm font-medium text-[#3f3932]">{subject}</p></div>
          <button type="button" onClick={() => copy("subject", subject)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfc1ad] bg-[#fffaf2] px-2.5 py-2 text-xs font-semibold text-[#574936]">{copied === "subject" ? <Check size={13}/> : <Clipboard size={13}/>} {copied === "subject" ? "Copiado" : "Copiar"}</button>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[#d8cbb8] bg-[#f7f0e6] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">Cuerpo</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#514b43]">{body}</p></div>
          <button type="button" onClick={() => copy("body", body)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#cfc1ad] bg-[#fffaf2] px-2.5 py-2 text-xs font-semibold text-[#574936]">{copied === "body" ? <Check size={13}/> : <Clipboard size={13}/>} {copied === "body" ? "Copiado" : "Copiar"}</button>
        </div>
      </div>
    </article>
  );
}
