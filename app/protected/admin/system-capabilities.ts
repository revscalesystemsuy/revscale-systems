export function getServerCapabilityStatus() {
  return {
    serviceRoleConfigured: Boolean(
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    integrationsSigningConfigured: Boolean(process.env.INTEGRATIONS_SIGNING_SECRET),
    appUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  };
}
