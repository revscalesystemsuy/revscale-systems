create index if not exists whatsapp_ai_settings_updated_by_idx
  on public.whatsapp_ai_settings (updated_by);

create index if not exists whatsapp_conversations_connection_id_idx
  on public.whatsapp_conversations (connection_id);
