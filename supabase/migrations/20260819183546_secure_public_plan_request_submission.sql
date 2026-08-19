create table if not exists private.plan_request_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table private.plan_request_rate_limits enable row level security;
revoke all on table private.plan_request_rate_limits from public, anon, authenticated;

create index if not exists plan_requests_email_created_idx
  on public.plan_requests ((lower(email)), created_at desc)
  where email is not null;

create or replace function public.submit_plan_request(
  p_name text,
  p_company text,
  p_email text,
  p_phone text,
  p_plan text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_company text := trim(coalesce(p_company, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := trim(coalesce(p_phone, ''));
  v_plan text := upper(trim(coalesce(p_plan, 'STARTER'));
  v_now timestamptz := now();
  v_count integer;
  v_window timestamptz;
  v_email_key text;
begin
  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Invalid name' using errcode = '22023';
  end if;

  if length(v_company) < 2 or length(v_company) > 160 then
    raise exception 'Invalid company' using errcode = '22023';
  end if;

  if length(v_email) < 5 or length(v_email) > 320
     or v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'Invalid email' using errcode = '22023';
  end if;

  if length(v_phone) > 50 then
    raise exception 'Invalid phone' using errcode = '22023';
  end if;

  if v_plan not in ('STARTER', 'PRO', 'PROFESSIONAL', 'ENTERPRISE') then
    raise exception 'Invalid plan' using errcode = '22023';
  end if;

  insert into private.plan_request_rate_limits as rl (rate_key, window_started_at, request_count, updated_at)
  values ('global', v_now, 1, v_now)
  on conflict (rate_key) do update
  set request_count = case
        when rl.window_started_at <= v_now - interval '1 minute' then 1
        else rl.request_count + 1
      end,
      window_started_at = case
        when rl.window_started_at <= v_now - interval '1 minute' then v_now
        else rl.window_started_at
      end,
      updated_at = v_now
  returning request_count, window_started_at into v_count, v_window;

  if v_count > 60 then
    raise exception 'Too many requests' using errcode = 'P0001';
  end if;

  v_email_key := 'email:' || encode(extensions.digest(v_email, 'sha256'), 'hex');

  insert into private.plan_request_rate_limits as rl (rate_key, window_started_at, request_count, updated_at)
  values (v_email_key, v_now, 1, v_now)
  on conflict (rate_key) do update
  set request_count = case
        when rl.window_started_at <= v_now - interval '1 hour' then 1
        else rl.request_count + 1
      end,
      window_started_at = case
        when rl.window_started_at <= v_now - interval '1 hour' then v_now
        else rl.window_started_at
      end,
      updated_at = v_now
  returning request_count, window_started_at into v_count, v_window;

  if v_count > 3 then
    raise exception 'Too many requests for this email' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.plan_requests pr
    where lower(pr.email) = v_email
      and upper(pr.plan) = v_plan
      and coalesce(pr.status, 'PENDING') = 'PENDING'
      and pr.created_at >= v_now - interval '24 hours'
  ) then
    return true;
  end if;

  insert into public.plan_requests (name, company, email, phone, plan, status)
  values (
    v_name,
    v_company,
    v_email,
    nullif(v_phone, ''),
    v_plan,
    'PENDING'
  );

  return true;
end;
$$;

revoke all on function public.submit_plan_request(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_plan_request(text, text, text, text, text) to anon, authenticated;

drop policy if exists "visitors can create pending plan requests" on public.plan_requests;

revoke all on table public.plan_requests from anon;
revoke insert, delete, references, trigger, truncate on table public.plan_requests from authenticated;
grant select, update on table public.plan_requests to authenticated;