"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim() || null;
const int = (fd: FormData, key: string) => { const v = text(fd, key); return v === null ? null : Number.parseInt(v, 10); };
const num = (fd: FormData, key: string) => { const v = text(fd, key); return v === null ? null : Number(v); };
const bool = (fd: FormData, key: string) => { const v = text(fd, key); return v === "YES" ? true : v === "NO" ? false : null; };

export async function saveDiscovery(formData: FormData) {
  const opportunityId = String(formData.get("opportunity_id") || "");
  const complete = String(formData.get("complete") || "") === "1";
  const disposition = text(formData, "disposition");
  if (!opportunityId) redirect("/protected/admin/sales?error=Oportunidad%20inv%C3%A1lida");
  if (complete && !["QUALIFIED", "NURTURE", "DISQUALIFIED"].includes(disposition || "")) {
    redirect(`/protected/admin/sales/discovery/${opportunityId}?error=Defin%C3%AD%20la%20disposici%C3%B3n%20antes%20de%20cerrar%20el%20discovery`);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: existing } = await supabase.from("b2b_discovery_sessions").select("id").eq("opportunity_id", opportunityId).eq("status", "OPEN").maybeSingle();
  const payload = {
    opportunity_id: opportunityId, created_by: userId,
    status: complete ? "COMPLETED" : "OPEN", completed_at: complete ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
    volume_monthly_inquiries: int(formData, "volume_monthly_inquiries"), volume_mix: text(formData, "volume_mix"), active_properties: int(formData, "active_properties"), agents_working_leads: int(formData, "agents_working_leads"), teams_count: int(formData, "teams_count"),
    flow_lead_entry: text(formData, "flow_lead_entry"), flow_after_hours: text(formData, "flow_after_hours"), flow_assignment: text(formData, "flow_assignment"), flow_attended_definition: text(formData, "flow_attended_definition"), flow_conversation_location: text(formData, "flow_conversation_location"), flow_next_action: text(formData, "flow_next_action"), flow_followup_control: text(formData, "flow_followup_control"), flow_no_action: text(formData, "flow_no_action"),
    visibility_response_time_known: bool(formData, "visibility_response_time_known"), visibility_response_minutes: int(formData, "visibility_response_minutes"), visibility_can_list_no_next_step: bool(formData, "visibility_can_list_no_next_step"), visibility_overdue_by_agent: bool(formData, "visibility_overdue_by_agent"), visibility_meeting_data_driven: bool(formData, "visibility_meeting_data_driven"), visibility_source_to_close: bool(formData, "visibility_source_to_close"),
    matching_new_property: text(formData, "matching_new_property"), matching_price_drop: text(formData, "matching_price_drop"), matching_reactivation_pct: num(formData, "matching_reactivation_pct"),
    stack_crm: text(formData, "stack_crm"), stack_daily_users: text(formData, "stack_daily_users"), stack_outside_crm: text(formData, "stack_outside_crm"), stack_loves: text(formData, "stack_loves"), stack_wont_change: text(formData, "stack_wont_change"), stack_one_fix: text(formData, "stack_one_fix"),
    economics_portal_spend_range: text(formData, "economics_portal_spend_range"), economics_net_value_per_deal_range: text(formData, "economics_net_value_per_deal_range"), economics_inquiry_to_visit_pct: num(formData, "economics_inquiry_to_visit_pct"), economics_visit_to_close_pct: num(formData, "economics_visit_to_close_pct"),
    observed_pain: text(formData, "observed_pain"), urgency_trigger: text(formData, "urgency_trigger"), sponsor_name: text(formData, "sponsor_name"), sponsor_role: text(formData, "sponsor_role"), implementation_constraints: text(formData, "implementation_constraints"), habit_change_signal: text(formData, "habit_change_signal"), economic_case: text(formData, "economic_case"), discovery_summary: text(formData, "discovery_summary"), next_step_recommendation: text(formData, "next_step_recommendation"),
    qualification_pain_explicit: bool(formData, "qualification_pain_explicit"), qualification_volume_sufficient: bool(formData, "qualification_volume_sufficient"), qualification_sponsor_authority: bool(formData, "qualification_sponsor_authority"), qualification_urgency_trigger: bool(formData, "qualification_urgency_trigger"), qualification_stack_fit: bool(formData, "qualification_stack_fit"), qualification_habit_change: bool(formData, "qualification_habit_change"), qualification_economic_value: bool(formData, "qualification_economic_value"), disposition,
  };

  const result = existing ? await supabase.from("b2b_discovery_sessions").update(payload).eq("id", existing.id) : await supabase.from("b2b_discovery_sessions").insert(payload);
  if (result.error) redirect(`/protected/admin/sales/discovery/${opportunityId}?error=${encodeURIComponent(result.error.message)}`);

  if (complete) {
    const stage = disposition === "QUALIFIED" ? "QUALIFIED" : disposition === "DISQUALIFIED" ? "LOST" : "CONTACTED";
    const nextStep = payload.next_step_recommendation || (disposition === "QUALIFIED" ? "Agendar Perfect Demo de 7 minutos." : disposition === "NURTURE" ? "Mantener en nurture hasta nuevo trigger." : "Cerrar oportunidad con motivo de p%C3%A9rdida.");
    await supabase.from("b2b_opportunities").update({ stage, next_step: nextStep, updated_at: new Date().toISOString() }).eq("id", opportunityId);
  }

  revalidatePath(`/protected/admin/sales/discovery/${opportunityId}`);
  revalidatePath(`/protected/admin/sales/${opportunityId}`);
  revalidatePath("/protected/admin/sales");
  redirect(`/protected/admin/sales/discovery/${opportunityId}?success=${complete ? "Discovery%20cerrado" : "Discovery%20guardado"}`);
}
