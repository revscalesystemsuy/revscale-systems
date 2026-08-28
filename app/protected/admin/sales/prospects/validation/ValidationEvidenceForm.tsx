"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { recordValidationEvidence } from "./actions";

type SignalKey =
  | "score_team_size"
  | "score_lead_volume"
  | "score_source_fragmentation"
  | "score_whatsapp_centrality"
  | "score_process_pain"
  | "score_growth_investment"
  | "score_decision_access";

type Props = {
  prospectId: string;
  companyName: string;
  missingKeys: SignalKey[];
  defaultChannel: "WHATSAPP" | "EMAIL" | "PHONE" | "OTHER";
};

const SIGNALS: Record<SignalKey, { label: string; options: { label: string; value: number }[] }> = {
  score_team_size: {
    label: "Tamaño del equipo",
    options: [
      { label: "1 agente · 5 pts", value: 5 },
      { label: "2–4 agentes · 10 pts", value: 10 },
      { label: ">20 agentes · 15 pts", value: 15 },
      { label: "5–20 agentes · 20 pts", value: 20 },
    ],
  },
  score_lead_volume: {
    label: "Volumen mensual de consultas",
    options: [
      { label: "<30 / mes · 2 pts", value: 2 },
      { label: "30–74 / mes · 6 pts", value: 6 },
      { label: "75–149 / mes · 12 pts", value: 12 },
      { label: "150+ / mes · 20 pts", value: 20 },
    ],
  },
  score_source_fragmentation: {
    label: "Fuentes activas de leads",
    options: [
      { label: "1 fuente · 5 pts", value: 5 },
      { label: "2+ fuentes · 15 pts", value: 15 },
    ],
  },
  score_whatsapp_centrality: {
    label: "WhatsApp en la operación",
    options: [
      { label: "No es de uso diario · 0 pts", value: 0 },
      { label: "Uso diario · 10 pts", value: 10 },
    ],
  },
  score_process_pain: {
    label: "Dolor de seguimiento",
    options: [
      { label: "No hay dolor visible · 0 pts", value: 0 },
      { label: "Dolor visible · 15 pts", value: 15 },
    ],
  },
  score_growth_investment: {
    label: "Inversión / crecimiento",
    options: [
      { label: "Sin inversión activa · 0 pts", value: 0 },
      { label: "Invierte en captación / crecimiento · 10 pts", value: 10 },
    ],
  },
  score_decision_access: {
    label: "Acceso a decisión",
    options: [
      { label: "Sin acceso al decisor · 0 pts", value: 0 },
      { label: "Owner / director / manager accesible · 5 pts", value: 5 },
    ],
  },
};

export default function ValidationEvidenceForm({ prospectId, companyName, missingKeys, defaultChannel }: Props) {
  const initialSignal = missingKeys[0] ?? null;
  const [signalKey, setSignalKey] = useState<SignalKey | "">(initialSignal ?? "");
  const options = useMemo(() => (signalKey ? SIGNALS[signalKey].options : []), [signalKey]);

  if (!missingKeys.length) {
    return (
      <div className="rounded-2xl border border-[#aeb99f] bg-[#e9ecdf] p-5 text-sm leading-6 text-[#526047]">
        <strong>{companyName}</strong> ya tiene las señales de discovery completas. Revisá su Tier en la vista de scoring antes de iniciar cualquier cadencia.
      </div>
    );
  }

  return (
    <form action={recordValidationEvidence} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
      <input type="hidden" name="prospect_id" value={prospectId} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">Registrar respuesta como evidencia</p>
          <p className="mt-2 text-xs leading-5 text-[#71695f]">Pegá la respuesta textual y traducila a una opción del scoring oficial. El registro queda auditado antes de recalcular el Tier.</p>
        </div>
      </div>

      <label className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#756b5f]">Señal validada</label>
      <select
        name="signal_key"
        value={signalKey}
        onChange={(event) => setSignalKey(event.target.value as SignalKey)}
        required
        className="mt-1.5 w-full rounded-lg border border-[#cfc4b3] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#403b34]"
      >
        {missingKeys.map((key) => <option key={key} value={key}>{SIGNALS[key].label}</option>)}
      </select>

      <label className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#756b5f]">Resultado según regla ICP</label>
      <select
        key={signalKey}
        name="score_value"
        required
        defaultValue=""
        className="mt-1.5 w-full rounded-lg border border-[#cfc4b3] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#403b34]"
      >
        <option value="" disabled>Seleccionar interpretación exacta</option>
        {options.map((option) => <option key={`${signalKey}-${option.value}`} value={option.value}>{option.label}</option>)}
      </select>

      <label className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#756b5f]">Canal de la respuesta</label>
      <select name="channel" defaultValue={defaultChannel} required className="mt-1.5 w-full rounded-lg border border-[#cfc4b3] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#403b34]">
        <option value="WHATSAPP">WhatsApp</option>
        <option value="EMAIL">Email</option>
        <option value="PHONE">Teléfono</option>
        <option value="OTHER">Otro</option>
      </select>

      <label className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#756b5f]">Respuesta textual del prospecto</label>
      <textarea
        name="response_text"
        required
        rows={4}
        placeholder="Pegá aquí la respuesta que respalda esta señal."
        className="mt-1.5 w-full rounded-lg border border-[#cfc4b3] bg-[#fffaf2] px-3 py-2.5 text-sm leading-6 text-[#403b34] placeholder:text-[#9b9185]"
      />

      <label className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#756b5f]">Nota interna opcional</label>
      <textarea
        name="evidence_note"
        rows={2}
        placeholder="Contexto o interpretación breve; no reemplaza la respuesta textual."
        className="mt-1.5 w-full rounded-lg border border-[#cfc4b3] bg-[#fffaf2] px-3 py-2.5 text-sm leading-6 text-[#403b34] placeholder:text-[#9b9185]"
      />

      <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#8f7b5f] bg-[#5f503d] px-3.5 py-2.5 text-xs font-semibold text-[#fffaf2]">
        <Save size={14} /> Registrar evidencia + recalcular
      </button>
    </form>
  );
}
