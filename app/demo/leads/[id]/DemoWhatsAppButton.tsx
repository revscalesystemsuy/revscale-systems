"use client"

import { useState } from "react"

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
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500/90 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-500"
      >
        <span aria-hidden="true">💬</span>
        {label}
      </button>

      {sent && (
        <div className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
          <p className="font-semibold">Interacción simulada (modo demo)</p>
          <p className="mt-1 text-green-200/80">
            {message ??
              `Se prepararía un mensaje de WhatsApp para ${leadName} (${phone}).`}
          </p>
          <p className="mt-1 text-xs text-green-200/60">
            En la demo no se envían mensajes reales.
          </p>
        </div>
      )}
    </div>
  )
}
