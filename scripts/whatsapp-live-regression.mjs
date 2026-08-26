import fs from "node:fs";

const requiredFiles = [
  "supabase/functions/whatsapp-webhook/index.ts",
  "supabase/functions/whatsapp-send/index.ts",
  "app/protected/inbox/page.tsx",
  "app/protected/inbox/actions.ts",
  "app/demo/inbox/page.tsx",
  "docs/whatsapp-live-activation.md",
  "supabase/migrations/20260826143747_harden_whatsapp_delivery_idempotency.sql",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing WhatsApp LIVE file: ${file}`);
}

const webhook = fs.readFileSync("supabase/functions/whatsapp-webhook/index.ts", "utf8");
const sender = fs.readFileSync("supabase/functions/whatsapp-send/index.ts", "utf8");
const actions = fs.readFileSync("app/protected/inbox/actions.ts", "utf8");
const inbox = fs.readFileSync("app/protected/inbox/page.tsx", "utf8");
const demo = fs.readFileSync("app/demo/inbox/page.tsx", "utf8");
const foundation = fs.readFileSync("supabase/migrations/20260826110000_complete_whatsapp_live_inbox_foundation.sql", "utf8");
const idempotency = fs.readFileSync("supabase/migrations/20260826143747_harden_whatsapp_delivery_idempotency.sql", "utf8");

const checks = [
  [webhook.includes("x-hub-signature-256"), "Webhook must validate Meta signature"],
  [webhook.includes("claimWebhookEvent"), "Webhook errors must be claimable for retry"],
  [webhook.includes('processing_status !== "ERROR"'), "Only failed webhook events may be reclaimed"],
  [webhook.includes('idempotencyKey = `ai:${inboundExternalId}`'), "AI replies must be idempotent per inbound message"],
  [webhook.includes("PROVIDER_STATE_UNKNOWN"), "Ambiguous provider state must not auto-resend"],
  [webhook.includes("HUMAN_REQUIRED"), "Webhook must support human handoff"],
  [webhook.includes("allowedPropertyIds"), "AI property context must be allow-listed"],
  [webhook.includes("confidence < 0.55"), "Low-confidence AI must hand off"],
  [sender.includes("db.auth.getUser(jwt)"), "Human sender must authenticate user"],
  [sender.includes("request_id"), "Human sender must require a stable request id"],
  [sender.includes('status: "QUEUED"'), "Human sender must reserve before calling Meta"],
  [sender.includes("PROVIDER_STATE_UNKNOWN"), "Human sender must preserve ambiguous delivery state"],
  [sender.includes("interaction_id"), "Human sender must reconcile SLA interaction once"],
  [actions.includes("stableSendRequestId"), "Inbox action must generate stable send idempotency key"],
  [inbox.includes("Espera humana") && inbox.includes("IA atendiendo") && inbox.includes("IA pausada"), "Inbox must expose AI/human states"],
  [demo.includes("Datos de demostración") && demo.includes("Handoff automático"), "Demo inbox must disclose fictional data and show handoff"],
  [foundation.includes("revoke all on public.whatsapp_webhook_events from public, anon, authenticated"), "Webhook audit table must be backend-only"],
  [foundation.includes("private.can_access_lead"), "Conversation workflow RLS must reuse lead access"],
  [idempotency.includes("whatsapp_messages_org_idempotency_key_idx"), "Outbound messages must have a unique org idempotency index"],
  [idempotency.includes("interaction_id"), "Outbound messages must link to their commercial interaction"],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) throw new Error(`WhatsApp LIVE regression failures:\n- ${failures.join("\n- ")}`);
console.log("WhatsApp LIVE regression checks passed");
