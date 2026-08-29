alter table public.b2b_discovery_sessions
  add column if not exists qualification_pain_explicit boolean,
  add column if not exists qualification_volume_sufficient boolean,
  add column if not exists qualification_sponsor_authority boolean,
  add column if not exists qualification_urgency_trigger boolean,
  add column if not exists qualification_stack_fit boolean,
  add column if not exists qualification_habit_change boolean,
  add column if not exists qualification_economic_value boolean,
  add column if not exists disposition text check (disposition is null or disposition in ('QUALIFIED','NURTURE','DISQUALIFIED'));
