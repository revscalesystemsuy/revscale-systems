create index if not exists automation_runs_rule_id_idx on public.automation_runs(rule_id);

drop policy if exists automation_rules_manage on public.automation_rules;

drop policy if exists automation_rules_insert on public.automation_rules;
create policy automation_rules_insert on public.automation_rules for insert to authenticated with check (
  exists (select 1 from public.organization_members om where om.organization_id = automation_rules.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE' and om.role in ('OWNER','MANAGER'))
);

drop policy if exists automation_rules_update on public.automation_rules;
create policy automation_rules_update on public.automation_rules for update to authenticated using (
  exists (select 1 from public.organization_members om where om.organization_id = automation_rules.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE' and om.role in ('OWNER','MANAGER'))
) with check (
  exists (select 1 from public.organization_members om where om.organization_id = automation_rules.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE' and om.role in ('OWNER','MANAGER'))
);

drop policy if exists automation_rules_delete on public.automation_rules;
create policy automation_rules_delete on public.automation_rules for delete to authenticated using (
  exists (select 1 from public.organization_members om where om.organization_id = automation_rules.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE' and om.role in ('OWNER','MANAGER'))
);
