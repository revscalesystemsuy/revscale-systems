"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clipboard, ExternalLink, Home, MessageCircle } from "lucide-react";
import { confirmPropertyWhatsAppSent, generatePropertyWhatsApp } from "./match-actions";

export default function PropertyWhatsAppButton({
  leadId,
  propertyId,
  phone,
}: {
  leadId: string;
  propertyId: string;
  phone?: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [error, setError] = useState("");

  async function generateMessage() {
    setLoading(true);
    setError("");
    setOpened(false);
    setRecorded(false);

    try {
      const result = await generatePropertyWhatsApp(leadId, propertyId);
      setMessage(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo generar el mensaje.");
    } finally {
      setLoading(false);
    }
  }

  async function copyMessage() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function openWhatsApp() {
    if (!message) return;
    const encoded = encodeURIComponent(message);
    const cleanPhone = phone?.replace(/\D/g, "") || "";
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(url, "_blank", "noopener,noreferrer");
    setOpened(true);
    setError("");
  }

  async function confirmSent() {
    if (!message || confirming || recorded) return;

    setConfirming(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("lead_id", leadId);
      formData.append("property_id", propertyId);
      formData.append("message", message);
      await confirmPropertyWhatsAppSent(formData);
      setRecorded(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar el envío.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-[#d8cbb9] bg-[#fffaf2] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b7b68]">WhatsApp de propiedad</p>
          <p className="mt-1 text-xs leading-5 text-[#81796e]">Generar o abrir WhatsApp no cuenta como envío. RevScale solo registra el contacto cuando lo confirmás.</p>
        </div>
        <Home size={17} strokeWidth={1.7} className="shrink-0 text-[#806d52]" />
      </div>

      <button
        type="button"
        onClick={generateMessage}
        disabled={loading}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-2.5 text-sm font-semibold text-[#554f47] transition hover:bg-[#efe4d5] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <MessageCircle size={15} strokeWidth={1.7} />
        {loading ? "Generando..." : message ? "Regenerar mensaje" : "Generar mensaje"}
      </button>

      {message && (
        <div className="mt-4 rounded-xl border border-[#d7caba] bg-[#f7f0e6] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#81796e]">Mensaje sugerido</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#5f594f]">{message}</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={copyMessage}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-medium text-[#5f513e] transition hover:bg-[#efe4d5]"
            >
              {copied ? <Check size={15} /> : <Clipboard size={15} />}
              {copied ? "Copiado" : "Copiar"}
            </button>

            <button
              type="button"
              onClick={openWhatsApp}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]"
            >
              <ExternalLink size={15} />
              Abrir WhatsApp
            </button>
          </div>

          {opened && !recorded && (
            <div className="mt-4 rounded-lg border border-[#cdb69a] bg-[#f3e8d9] p-3">
              <p className="text-xs leading-5 text-[#6e604e]">WhatsApp ya se abrió. Si efectivamente enviaste esta propiedad al lead, confirmalo para guardar la interacción y la propiedad asociada.</p>
              <button
                type="button"
                onClick={confirmSent}
                disabled={confirming}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#ad9272] bg-[#e9ddcc] px-4 py-2.5 text-sm font-semibold text-[#554836] transition hover:bg-[#e2d3bf] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check size={15} />
                {confirming ? "Registrando..." : "Confirmar que la envié"}
              </button>
            </div>
          )}

          {recorded && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#b9c0ad] bg-[#e6e9df] p-3 text-sm text-[#536047]">
              <Check size={16} className="mt-0.5 shrink-0" />
              <span>Propiedad enviada y registrada. Si el lead estaba en Nuevo, RevScale lo movió a Contactado.</span>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 rounded-lg border border-[#c9a69a] bg-[#f1dfd8] p-3 text-sm text-[#704b3d]">{error}</p>}
    </div>
  );
}
