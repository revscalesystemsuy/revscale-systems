revoke execute on function public.get_paid_optimization_snapshot(text,text,date,date) from public;
revoke execute on function public.get_paid_optimization_snapshot(text,text,date,date) from anon;
grant execute on function public.get_paid_optimization_snapshot(text,text,date,date) to authenticated;
