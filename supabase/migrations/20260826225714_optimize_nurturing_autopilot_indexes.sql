create index if not exists nurture_steps_organization_id_idx on public.nurture_steps(organization_id);
create index if not exists nurture_enrollments_sequence_id_idx on public.nurture_enrollments(sequence_id);
create index if not exists nurture_actions_lead_id_idx on public.nurture_actions(lead_id);
create index if not exists nurture_actions_sequence_id_idx on public.nurture_actions(sequence_id);
create index if not exists nurture_actions_step_id_idx on public.nurture_actions(step_id);
