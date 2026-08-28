"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type Props = {
  priority: number;
  companyName: string;
  channel: string;
  destination: string | null;
  subject: string | null;
  message: string;
  followUp: string | null;
  disabled?: boolean;
};

export default function ValidationContactCard({
  priority,
  companyName,
  channel,
  destination,
  subject,
  message,
  followUp,
  disabled = false,
}: Props) {
  const [copied, setCopied] = useState<"initial" | "followup" | null>(null);

  async function copyText(text: string, key: "initial" | "followup") {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600);
  }

  return (
    <article className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">Prioridad #{priority}</p>
          <h3 className="mt-2 font-serif text-2xl font-medium text-[#302d28]">{companyName}</h3>
        </div>
        <span className="rounded-full border border-[#cfc4b3] bg-[#f5eee4] px-3 py-1 text-[10px] font-semibold text-[#685e51]">{channel}</span>
      </div>

      {destination ? <p className="mt-3 break-all text-xs text-[#81786d]">{destination}</p> : <p className="mt-3 text-xs font-semibold text-[#8a5c43]">Sin canal verificado: completar canal antes de contactar.</p>}

      {subject && <div className="mt-4 rounded-xl border border-[#ddd1c0] bg-[#f7f0e6] p-3 text-xs text-[#665f56]"><strong>Asunto:</strong> {subject}</div>}

      <div className="mt-4 rounded-xl border border-[#ddd1c0] bg-white/50 p-4 text-sm leading-6 text-[#4d4841]">{message}</div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => void copyText(message, "initial")}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#8f7b5f] bg-[#5f503d] px-3.5 py-2 text-xs font-semibold text-[#fffaf2] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {copied === "initial" ? <Check size={14} /> : <Copy size={14} />}
        {copied === "initial" ? "Copiado" : "Copiar primer mensaje"}
      </button>

      {followUp && (
        <div className="mt-5 border-t border-[#e4d9ca] pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">Solo si responde</p>
          <p className="mt-2 text-xs leading-5 text-[#665f56]">{followUp}</p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void copyText(followUp, "followup")}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#c2b39e] bg-[#f5eee4] px-3 py-2 text-xs font-semibold text-[#5c5145] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied === "followup" ? <Check size={14} /> : <Copy size={14} />}
            {copied === "followup" ? "Copiado" : "Copiar segunda respuesta"}
          </button>
        </div>
      )}
    </article>
  );
}
