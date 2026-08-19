# Supabase baseline strategy

## Current status

The repository contains every migration recorded in `supabase_migrations.schema_migrations`, starting at `20260818125657_add_enterprise_teams_and_lead_assignment`.

That first recorded migration is **not** a complete bootstrap migration. It assumes that core tables already exist, including `organizations`, `profiles`, `organization_members`, `leads`, and related CRM tables. Therefore, replaying only `supabase/migrations/` against an empty PostgreSQL/Supabase project is not yet a supported recovery path.

Do not represent the migration directory as a zero-to-production bootstrap until the pre-ledger schema has been reconstructed and validated on an empty database.

## Safe baseline workflow

The baseline must be produced from schema metadata, not copied from production data.

1. Capture a schema-only dump of the current production database (no rows, no auth users, no secrets).
2. Keep auth-managed Supabase schemas out of the application baseline unless Supabase CLI explicitly manages them.
3. Reconstruct the **pre-ledger application schema**: the state immediately before migration `20260818125657`.
4. Validate the reconstructed baseline by creating an empty isolated Supabase database, applying the baseline, then replaying every migration in timestamp order.
5. Compare the resulting tables, constraints, indexes, functions, triggers, grants, and RLS policies with production.
6. Only after the catalogs match should the baseline be promoted to an executable bootstrap artifact.

## Why the current schema cannot simply become migration 0000

Using today's schema as an earlier migration and then replaying the historical migrations would re-create or alter objects that already exist and can produce conflicts, duplicate policies/triggers, or incorrect historical semantics. A valid baseline must represent the database **before** the first ledger migration, not the database after all migrations.

## Required validation gate

A baseline is considered complete only when all of the following are true on an empty isolated project:

- baseline applies successfully;
- every file under `supabase/migrations/` applies successfully in order;
- `supabase/tests/rls_regression.sql` passes;
- catalog comparison finds no unexpected drift in application-owned schemas;
- no production data, auth user rows, integration tokens, password material, or service-role secrets are present in the baseline.

## Current blocker

Supabase branching is not enabled for the current project plan, so the final destructive/empty-database validation cannot safely be run against a temporary branch from the connected project. Until an isolated database is available, this directory intentionally documents the recovery contract without pretending that zero-to-production bootstrap has already been proven.
