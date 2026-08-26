create index if not exists territories_created_by_idx on public.territories(created_by) where created_by is not null;
create index if not exists territory_assignments_created_by_idx on public.territory_assignments(created_by) where created_by is not null;
create index if not exists acquisition_prospects_created_by_idx on public.acquisition_prospects(created_by) where created_by is not null;
create index if not exists acquisition_activities_created_by_idx on public.acquisition_activities(created_by);
