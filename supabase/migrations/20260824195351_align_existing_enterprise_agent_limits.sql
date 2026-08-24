update public.subscriptions
set max_agents = 30, updated_at = now()
where upper(plan) = 'ENTERPRISE'
  and (max_agents is null or max_agents > 30);
