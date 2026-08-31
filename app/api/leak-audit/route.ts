import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const int = (value: unknown, min = 0, max = 5000) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const v = Math.round(n);
    return v >= min && v <= max ? v : null;
  };
  const num = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const text = (value: unknown, max = 320) => String(value || "").trim().slice(0, max);

  const rowCount = int(body.row_count, 1, 5000);
  const score = int(body.score, 0, 100);
  const unowned = int(body.unowned_count);
  const noNext = int(body.no_next_step_count);
  const overdue = int(body.overdue_followup_count);
  const highIntent = int(body.high_intent_inactive_count);
  const reactivate = int(body.reactivation_candidate_count);
  if ([rowCount, score, unowned, noNext, overdue, highIntent, reactivate].some((v) => v === null)) {
    return NextResponse.json({ error: "invalid_metrics" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_leak_audit", {
    p_company: text(body.company, 160),
    p_contact_name: text(body.contact_name, 120),
    p_contact_email: text(body.contact_email, 320).toLowerCase(),
    p_source_filename: text(body.source_filename, 255),
    p_row_count: rowCount,
    p_score: score,
    p_unowned_count: unowned,
    p_no_next_step_count: noNext,
    p_overdue_followup_count: overdue,
    p_high_intent_inactive_count: highIntent,
    p_reactivation_candidate_count: reactivate,
    p_median_age_days: num(body.median_age_days),
    p_median_first_response_minutes: num(body.median_first_response_minutes),
    p_stage_distribution: body.stage_distribution && typeof body.stage_distribution === "object" ? body.stage_distribution : {},
    p_metric_snapshot: body.metric_snapshot && typeof body.metric_snapshot === "object" ? body.metric_snapshot : {},
  });

  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ id: data });
}
