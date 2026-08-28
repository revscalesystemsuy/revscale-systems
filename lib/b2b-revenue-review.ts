export type RevenueOpportunity = {
  stage: string;
  tier: string;
  acquisition_source: string;
  next_step_due_at: string | null;
  created_at: string;
  lost_at: string | null;
  loss_reason: string | null;
  demo_booked_at: string | null;
  demo_completed_at: string | null;
  pilot_proposed_at: string | null;
  pilot_started_at: string | null;
  paid_at: string | null;
};

export type RevenueConversionEvent = {
  event_type: string;
  occurred_at: string;
};

const STAGES = ["NEW","CONTACTED","QUALIFIED","DEMO_BOOKED","DEMO_COMPLETED","PILOT_PROPOSED","PILOT_ACTIVE","PAID","LOST"];
const TIERS = ["A","B","C","LOW","UNSCORED"];

function percent(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : null;
}

function dateInMontevideo(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function getRevenueWeek(now = new Date()) {
  const localDate = dateInMontevideo(now);
  const localMidnight = new Date(`${localDate}T00:00:00-03:00`);
  const mondayOffset = (localMidnight.getUTCDay() + 6) % 7;
  const start = new Date(localMidnight.getTime() - mondayOffset * 24 * 60 * 60 * 1000);
  return {
    weekStartDate: dateInMontevideo(start),
    weekStartIso: start.toISOString(),
    nowIso: now.toISOString(),
  };
}

export function buildRevenueSnapshot(
  opportunities: RevenueOpportunity[],
  events: RevenueConversionEvent[],
  now = new Date(),
) {
  const { weekStartDate, weekStartIso, nowIso } = getRevenueWeek(now);
  const weekStart = new Date(weekStartIso).getTime();
  const nowMs = now.getTime();
  const open = opportunities.filter((item) => !["PAID", "LOST"].includes(item.stage));
  const overdue = open.filter((item) => item.next_step_due_at && new Date(item.next_step_due_at).getTime() < nowMs).length;
  const newThisWeek = opportunities.filter((item) => new Date(item.created_at).getTime() >= weekStart).length;
  const lossesThisWeek = opportunities.filter((item) => item.lost_at && new Date(item.lost_at).getTime() >= weekStart);
  const weeklyEvents = events.filter((event) => new Date(event.occurred_at).getTime() >= weekStart);

  const stageCounts = Object.fromEntries(STAGES.map((stage) => [stage, opportunities.filter((item) => item.stage === stage).length]));
  const tierCounts = Object.fromEntries(TIERS.map((tier) => [tier, opportunities.filter((item) => item.tier === tier).length]));
  const sourceCounts = opportunities
    .filter((item) => new Date(item.created_at).getTime() >= weekStart)
    .reduce<Record<string, number>>((acc, item) => {
      acc[item.acquisition_source] = (acc[item.acquisition_source] || 0) + 1;
      return acc;
    }, {});
  const lossReasonCounts = lossesThisWeek.reduce<Record<string, number>>((acc, item) => {
    const reason = item.loss_reason || "UNKNOWN";
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});
  const weeklyEventCounts = weeklyEvents.reduce<Record<string, number>>((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {});

  const booked = opportunities.filter((item) => item.demo_booked_at).length;
  const shown = opportunities.filter((item) => item.demo_completed_at).length;
  const shownWithPilot = opportunities.filter((item) => item.demo_completed_at && item.pilot_proposed_at).length;
  const pilotStarted = opportunities.filter((item) => item.pilot_started_at).length;
  const pilotPaid = opportunities.filter((item) => item.pilot_started_at && item.paid_at).length;

  return {
    week_start: weekStartDate,
    generated_at: nowIso,
    pipeline: {
      total: opportunities.length,
      open: open.length,
      overdue_next_steps: overdue,
      new_this_week: newThisWeek,
      stages: stageCounts,
      tiers: tierCounts,
    },
    weekly_activity: {
      demos_booked: weeklyEventCounts.DEMO_BOOKED || 0,
      demo_shows: weeklyEventCounts.DEMO_SHOW || 0,
      demo_no_shows: weeklyEventCounts.DEMO_NO_SHOW || 0,
      demos_rescheduled: weeklyEventCounts.DEMO_RESCHEDULED || 0,
      pilots_proposed: weeklyEventCounts.PILOT_PROPOSED || 0,
      pilots_started: weeklyEventCounts.PILOT_STARTED || 0,
      payments: weeklyEventCounts.PAID || 0,
      losses: lossesThisWeek.length,
    },
    acquisition_this_week: sourceCounts,
    loss_reasons_this_week: lossReasonCounts,
    conversion_observed: {
      booked_to_show_pct: percent(shown, booked),
      show_to_pilot_pct: percent(shownWithPilot, shown),
      pilot_to_paid_pct: percent(pilotPaid, pilotStarted),
      booked,
      shown,
      shown_with_pilot: shownWithPilot,
      pilots_started: pilotStarted,
      pilots_paid: pilotPaid,
    },
  };
}
