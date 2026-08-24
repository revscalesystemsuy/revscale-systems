# RevScale recurring billing activation

RevScale billing is designed as a recurring SaaS subscription.

## Commercial catalog

| Plan | Monthly | Annual |
| --- | ---: | ---: |
| Starter | USD 99 | USD 990 |
| Professional | USD 249 | USD 2,490 |
| Enterprise | USD 499 | USD 4,990 |

Annual billing charges once for 12 months and is priced as 10 monthly payments (2 months effectively included).

Enterprise is capped at 30 active agents. Larger organizations should use a custom commercial agreement.

## Current zero-cost preparation state

The database schema, checkout UI, Paddle webhook and subscription synchronization are prepared. The public checkout remains disabled until Paddle credentials and catalog price IDs are configured. No payment-provider transaction is created while these values are empty.

## Paddle catalog to create

Create three recurring products or one product with six recurring prices, all in USD:

- Starter monthly: USD 99 every month
- Starter annual: USD 990 every year
- Professional monthly: USD 249 every month
- Professional annual: USD 2,490 every year
- Enterprise monthly: USD 499 every month
- Enterprise annual: USD 4,990 every year

Copy each `pri_...` ID into both the Vercel public environment variables and the protected database catalog. The values must match exactly because webhook activation validates the purchased Price ID against the requested plan and cycle.

Vercel variables:

- `NEXT_PUBLIC_PADDLE_ENV` = `sandbox` or `production`
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
- `NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTHLY`
- `NEXT_PUBLIC_PADDLE_PRICE_STARTER_ANNUAL`
- `NEXT_PUBLIC_PADDLE_PRICE_PROFESSIONAL_MONTHLY`
- `NEXT_PUBLIC_PADDLE_PRICE_PROFESSIONAL_ANNUAL`
- `NEXT_PUBLIC_PADDLE_PRICE_ENTERPRISE_MONTHLY`
- `NEXT_PUBLIC_PADDLE_PRICE_ENTERPRISE_ANNUAL`

Database catalog:

```sql
update public.billing_price_catalog set paddle_price_id = '<PRICE_ID>' where plan = 'STARTER' and billing_cycle = 'MONTHLY';
update public.billing_price_catalog set paddle_price_id = '<PRICE_ID>' where plan = 'STARTER' and billing_cycle = 'ANNUAL';
update public.billing_price_catalog set paddle_price_id = '<PRICE_ID>' where plan = 'PROFESSIONAL' and billing_cycle = 'MONTHLY';
update public.billing_price_catalog set paddle_price_id = '<PRICE_ID>' where plan = 'PROFESSIONAL' and billing_cycle = 'ANNUAL';
update public.billing_price_catalog set paddle_price_id = '<PRICE_ID>' where plan = 'ENTERPRISE' and billing_cycle = 'MONTHLY';
update public.billing_price_catalog set paddle_price_id = '<PRICE_ID>' where plan = 'ENTERPRISE' and billing_cycle = 'ANNUAL';
```

## Webhook activation

The deployed Supabase Edge Function is `paddle-webhook`. It intentionally has JWT verification disabled because Paddle cannot send a Supabase user JWT; instead it authenticates every request with Paddle's HMAC webhook signature.

Before registering the webhook in Paddle, set the Supabase Edge Function secret:

- `PADDLE_WEBHOOK_SECRET`

Subscribe to at least:

- `transaction.completed`
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`

The webhook verifies `Paddle-Signature` against the raw request body, rejects stale signatures, stores each provider event idempotently, validates the actual Paddle Price ID, and only then activates the plan.

## Provisioning behavior

- A completed/active subscription with the correct Price ID activates the matching plan request.
- The customer must have created a RevScale account with the same email before automatic provisioning can create or attach the organization.
- `past_due`, `paused`, or `canceled` subscription states suspend access without deleting CRM data.
- An authorized RevScale platform admin can still activate a request manually; those activations are marked `MANUAL` rather than `PAID`.
- Payment-success pages never grant access by themselves. The signed webhook is the source of truth.

## Before first live charge

1. Complete Paddle seller onboarding and domain approval.
2. Create the six recurring prices.
3. Configure the Vercel client token and Price IDs.
4. Configure the same Price IDs in `billing_price_catalog`.
5. Configure `PADDLE_WEBHOOK_SECRET` in Supabase.
6. Register the Supabase `paddle-webhook` URL in Paddle.
7. Test all three plans monthly and annual in sandbox.
8. Test renewal, failed payment, cancellation and duplicate webhook delivery.
9. Switch the Paddle environment and catalog IDs to production only after sandbox passes.
