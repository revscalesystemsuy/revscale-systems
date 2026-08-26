import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateSlaSettings } from "./actions";

export default async function SlaSettingsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();
  if (!membership) redirect("/protected");

  const { data: settings } = await supabase
    .from("organization_sla_settings")
    .select("is_enabled,first_human_response_minutes,warning_minutes_before,escalation_minutes_after,auto_reassign_on_breach")
    .eq("organization_id", membership.organization_id)
    .single();

  const editable = ["OWNER", "MANAGER"].includes(membership.role);
  const config = settings || {
    is_enabled: true,
    first_human_response_minutes: 15,
    warning_minutes_before: 5,
    escalation_minutes_after: 15,
    auto_reassign_on_breach: false,
  };

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/protected/settings" className="text-sm font-medium text-[#756246]">Volver a Configuración</Link>
        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Velocidad comercial</p>
        <h1 className="mt-3 font-serif text-4xl font-medium text-[#292722] md:text-5xl">SLA de primera respuesta</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">El reloj empieza cuando el lead queda asignado. La respuesta automática se registra por separado; el cumplimiento se mide contra la primera respuesta humana.</p>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 md:p-8">
          <form action={updateSlaSettings} className="space-y-6">
            <label className="flex items-center justify-between gap-5 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4">
              <div><p className="font-semibold text-[#37332d]">SLA activo</p><p className="mt-1 text-xs leading-5 text-[#81796e]">Activa reloj, alerta preventiva, incumplimiento y escalamiento.</p></div>
              <input type="checkbox" name="is_enabled" defaultChecked={config.is_enabled} disabled={!editable} className="h-5 w-5" />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Primera respuesta humana" name="first_human_response_minutes" value={config.first_human_response_minutes} suffix="min" disabled={!editable} />
              <Field label="Avisar antes de vencer" name="warning_minutes_before" value={config.warning_minutes_before} suffix="min" disabled={!editable} />
              <Field label="Escalar después de vencer" name="escalation_minutes_after" value={config.escalation_minutes_after} suffix="min" disabled={!editable} />
            </div>

            <div className="rounded-xl border border-[#d7caba] bg-[#eee4d5] p-4 text-sm leading-6 text-[#625d55]">
              <strong className="text-[#403b34]">Reasignación automática:</strong> preparada a nivel de arquitectura, pero desactivada. RevScale no moverá leads automáticamente hasta que existan reglas de cobertura suficientemente seguras.
            </div>

            {editable ? <button className="rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2]">Guardar SLA</button> : <p className="text-sm text-[#81796e]">Podés consultar esta configuración, pero solo Gerencia o Dirección puede modificarla.</p>}
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({ label, name, value, suffix, disabled }: { label: string; name: string; value: number; suffix: string; disabled: boolean }) {
  return <label className="rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4"><span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#81796e]">{label}</span><div className="mt-3 flex items-center gap-2"><input type="number" min={0} name={name} defaultValue={value} disabled={disabled} className="w-full rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-3 py-2.5 text-[#37332d]" /><span className="text-xs text-[#81796e]">{suffix}</span></div></label>;
}
