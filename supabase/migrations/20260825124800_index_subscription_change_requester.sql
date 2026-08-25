create index if not exists subscription_change_requests_requested_by_idx
  on public.subscription_change_requests (requested_by);
