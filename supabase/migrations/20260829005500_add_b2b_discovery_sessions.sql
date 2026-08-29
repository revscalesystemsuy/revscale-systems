create table if not exists public.b2b_discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.b2b_opportunities(id) on delete cascade,
  created_by uuid not null,
  status text not null default 'OPEN' check (status in ('OPEN','COMPLETED')),
  started_at timestamptz not null default now(), completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  volume_monthly_inquiries integer check (volume_monthly_inquiries is null or volume_monthly_inquiries >= 0), volume_mix text,
  active_properties integer check (active_properties is null or active_properties >= 0), agents_working_leads integer check (agents_working_leads is null or agents_working_leads >= 0), teams_count integer check (teams_count is null or teams_count >= 0),
  flow_lead_entry text, flow_after_hours text, flow_assignment text, flow_attended_definition text, flow_conversation_location text, flow_next_action text, flow_followup_control text, flow_no_action text,
  visibility_response_time_known boolean, visibility_response_minutes integer check (visibility_response_minutes is null or visibility_response_minutes >= 0), visibility_can_list_no_next_step boolean, visibility_overdue_by_agent boolean, visibility_meeting_data_driven boolean, visibility_source_to_close boolean,
  matching_new_property text, matching_price_drop text, matching_reactivation_pct numeric(5,2) check (matching_reactivation_pct is null or (matching_reactivation_pct between 0 and 100)),
  stack_crm text, stack_daily_users text, stack_outside_crm text, stack_loves text, stack_wont_change text, stack_one_fix text,
  economics_portal_spend_range text, economics_net_value_per_deal_range text, economics_inquiry_to_visit_pct numeric(5,2) check (economics_inquiry_to_visit_pct is null or economics_inquiry_to_visit_pct between 0 and 100), economics_visit_to_close_pct numeric(5,2) check (economics_visit_to_close_pct is null or economics_visit_to_close_pct between 0 and 100),
  observed_pain text, urgency_trigger text, sponsor_name text, sponsor_role text, implementation_constraints text, habit_change_signal text, economic_case text, discovery_summary text, next_step_recommendation text
);
create index if not exists b2b_discovery_sessions_opportunity_idx on public.b2b_discovery_sessions(opportunity_id, created_at desc);
create unique index if not exists b2b_discovery_sessions_one_open_idx on public.b2b_discovery_sessions(opportunity_id) where status='OPEN';
alter table public.b2b_discovery_sessions enable row level security;
drop policy if exists "platform admins can view b2b discovery sessions" on public.b2b_discovery_sessions;
create policy "platform admins can view b2b discovery sessions" on public.b2b_discovery_sessions for select using (exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())));
drop policy if exists "platform admins can insert b2b discovery sessions" on public.b2b_discovery_sessions;
create policy "platform admins can insert b2b discovery sessions" on public.b2b_discovery_sessions for insert with check (created_by=(select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())));
drop policy if exists "platform admins can update b2b discovery sessions" on public.b2b_discovery_sessions;
create policy "platform admins can update b2b discovery sessions" on public.b2b_discovery_sessions for update using (exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())));
drop policy if exists "platform admins can delete b2b discovery sessions" on public.b2b_discovery_sessions;
create policy "platform admins can delete b2b discovery sessions" on public.b2b_discovery_sessions for delete using (exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())));
