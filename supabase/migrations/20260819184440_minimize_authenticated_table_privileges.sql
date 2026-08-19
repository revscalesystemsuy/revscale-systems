revoke delete on table public.interactions from authenticated;
revoke delete on table public.leads from authenticated;

revoke insert, update, delete on table public.organization_members from authenticated;
revoke delete on table public.organization_onboarding from authenticated;
revoke insert, delete on table public.organizations from authenticated;
revoke insert, update, delete on table public.platform_admins from authenticated;
revoke insert, delete on table public.profiles from authenticated;
revoke delete on table public.properties from authenticated;
revoke insert, delete on table public.subscriptions from authenticated;

-- Notifications intentionally use a column-level UPDATE grant for read_at only.
revoke update on table public.notifications from authenticated;
grant update (read_at) on table public.notifications to authenticated;