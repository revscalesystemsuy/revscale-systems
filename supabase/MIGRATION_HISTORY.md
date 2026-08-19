# Supabase migration history

The SQL files under `supabase/migrations/` now mirror every migration recorded in the production project's `supabase_migrations.schema_migrations` table from `20260818125657` onward.

## Source of truth

Historical files through `20260819005738` were recovered from the exact SQL stored by Supabase in production migration history. Files from `20260819011721` onward were already versioned when the production hardening work shipped.

This backfill is intentionally source-only: the recovered migrations are already applied in production and MUST NOT be re-applied there manually.

## Important prehistory boundary

The earliest recorded migration (`20260818125657_add_enterprise_teams_and_lead_assignment.sql`) references pre-existing objects including `public.organizations`, `public.organization_members`, `public.profiles`, `public.leads`, `public.properties`, `public.followups`, `public.interactions`, `public.subscriptions`, `public.plan_requests`, `public.organization_onboarding`, and `private.is_org_member`.

Therefore the migration history is now complete relative to Supabase's recorded migration ledger, but it is not yet a standalone empty-database bootstrap. The original base schema predates the first recorded migration and must be captured separately before claiming that `supabase db reset` can rebuild the project from an empty database.

## Release rule

For every schema change going forward:

1. create/version the migration in this directory,
2. apply it through the controlled Supabase migration workflow,
3. run security and performance advisors,
4. ship database and application changes in the same PR when they depend on each other,
5. never apply production-only DDL that is absent from Git.
