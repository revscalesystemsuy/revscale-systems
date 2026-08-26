import fs from "node:fs";

const requiredFiles = [
  "supabase/functions/whatsapp-webhook/index.ts",
  "supabase/functions/whatsapp-send/index.ts",
  "app/protected/inbox/page.tsx",
  "app/protected/inbox/actions.ts",
  "app/demo/inbox/page.tsx",
  "docs/whatsapp-live-activation.md",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing WhatsApp LIVE file: ${file}`);
}

const webhook = fs.readFileSync("supabase/functions/whatsapp-webhook/index.ts", "utf8");
const sender = fs.readFileSync("supabase/functions/whatsapp-send/index.ts", "utf8");
const inbox = fs.readFileSync("app/protected/inbox/page.tsx", "utf8");
const demo = fs.readFileSync("app/demo/inbox/page.tsx", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260826110000_complete_whatsapp_live_inbox_foundation.sql", "utf8");

const checks = [
  [webhook.includes("x-hub-signature-256"), "Webhook must validate Meta signature"],
  [webhook.includes("whatsapp_webhook_events"), "Webhook must use idempotency audit events"],
  [webhook.includes("HUMAN_REQUIRED"), "Webhook must support human handoff"],
  [webhook.includes("allowedPropertyIds"), "AI property context must be allow-listed"],
  [webhook.includes("confidence < 0.55"), "Low-confidence AI must hand off"],
  [sender.includes("db.auth.getUser(jwt)"), "Human sender must authenticate user"],
  [sender.includes("META_WHATSAPP_ACCESS_TOKEN"), "Human sender must require Meta credentials"],
  [sender.includes('actor,'), "Human sender must write an SLA interaction actor"],
  [inbox.includes("Espera humana") && inbox.includes("IA atendiendo") && inbox.includes("IA pausada"), "Inbox must expose AI/human states"],
  [demo.includes("Datos de demostración") && demo.includes("Handoff automático"), "Demo inbox must disclose fictional data and show handoff"],
  [migration.includes("revoke all on public.whatsapp_webhook_events from public, anon, authenticated"), "Webhook audit table must be backend-only"],
  [migration.includes("private.can_access_lead"), "Conversation workflow RLS must reuse lead access"],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) throw new Error(`WhatsApp LIVE regression failures:\n- ${failures.join("\n- ")}`);
console.log("WhatsApp LIVE regression checks passed");
