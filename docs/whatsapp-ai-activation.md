# WhatsApp AI activation

RevScale keeps the WhatsApp AI integration in `PREPARATION` until a paying customer is ready to connect a real WhatsApp Business account.

## Zero-cost preparation state

- Do not configure Meta credentials yet.
- Do not deploy or register the WhatsApp webhook with Meta yet.
- Do not enable an AI provider yet.
- Keep `whatsapp_ai_settings.mode = PREPARATION`.
- Keep `auto_reply_enabled = false`.
- Agency owners may configure tone, address style, emoji level, response length and human handoff rules without sending any external request.
- `whatsapp_connections` stores non-secret account identifiers only after activation. Never store access tokens or app secrets in public tables.

## First customer activation checklist

1. Complete the Meta Business / WhatsApp Business Platform setup required for the customer account.
2. Configure the Meta app and the WhatsApp product, including Embedded Signup if RevScale will onboard customer WABAs directly.
3. Set Edge Function secrets for the production project. At minimum the verification layer expects:
   - `META_WHATSAPP_VERIFY_TOKEN`
   - `META_APP_SECRET`
4. Deploy `supabase/functions/whatsapp-webhook` with public JWT verification disabled only because Meta cannot provide a Supabase JWT. The function must continue to validate Meta's verification token and `X-Hub-Signature-256` before accepting payloads.
5. Register the deployed callback URL in Meta and verify the webhook.
6. Store only the customer's non-secret WABA ID, phone number ID, display number and connection state in `whatsapp_connections`.
7. Enable the selected AI provider only after commercial activation. Keep provider credentials in backend/Edge Function secrets, never in the browser or public tables.
8. Implement/enable the message processor: resolve organization and lead, persist inbound message, load conversation/property context, classify intent, generate a grounded reply, update CRM fields and decide whether human handoff is required.
9. Test with real scenarios: availability, price, financing, bedrooms, location, property matching, booking request, negotiation, complaint, legal question, low-confidence answer and explicit request for a human.
10. Verify WhatsApp template/service-window rules for outbound messages before enabling automatic sending.
11. Only after successful tests set the organization's mode to `LIVE` and `auto_reply_enabled = true`.

## Safety rules for the live processor

- Never invent property facts. If a requested fact is not in RevScale, ask for clarification or hand off to a human.
- Never autonomously make binding promises about price, financing, legal status, contracts or negotiations.
- Pause automation immediately when the customer explicitly asks for a person or when confidence is low.
- Preserve the full conversation trail and the AI/human actor in RevScale.
- Attribute model usage by organization so plan limits and future billing can be enforced.
