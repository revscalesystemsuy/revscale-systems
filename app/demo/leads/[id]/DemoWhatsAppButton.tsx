"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"

export function DemoWhatsAppButton({
  leadName,
  phone,
  label = "Enviar WhatsApp",
  message,
}: {
  leadName: string
  phone: string
  label?: string
  message?: string
}) {
  const [sent, setSent] = useState(false)

  return (
    <div>
      <button
        onClick={() => setSent(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#8fa187] bg-[#e4ebdf] px-5 py-2.5 text-sm font-semibold text-[#3f513a] transition hover:bg-[#d9e4d3]"
      >
        <MessageCircle size={16} strokeWidth={1.7} />
        {label}
      </button>

      {sent && (
        <div className="mt-3 rounded-xl border border-[#aab8a2] bg-[#edf2e9] p-3 text-sm text-[#45533f]">
          <p className="font-semibold text-[#34422f]">Interacción simulada</p>
          <p className="mt-1 leading-5 text-[#52604c]">
            {message ??
              `Se prepararía un mensaje de WhatsApp para ${leadName} (${phone}).`}
          </p>
          <p className="mt-1 text-xs text-[#64705e]">
            En la demo no se envían mensajes reales.
          </p>
        </div>
      )}
    </div>
  )
}
