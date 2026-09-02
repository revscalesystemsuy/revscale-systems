# RevScale PropertyOS — Production legal/compliance checklist

Status date: 2026-09-01

This file records operational items that cannot be safely invented or completed only through source code. It is not a substitute for advice from a qualified professional in Uruguay.

## Implemented in product

- Versioned acceptance of Terms and Privacy at account creation.
- Privacy notice and explicit data-processing consent on public brokerage inquiry forms.
- Separate, optional WhatsApp service-contact opt-in on public forms.
- Evidence table for contact consent, including notice version and exact notice text.
- Privacy Policy covering controller/processor roles, AI, WhatsApp, providers, international processing, retention and rights.
- Terms covering recurring billing, renewal, plan changes, cancellation, refunds, third-party providers and mandatory rights.
- Cookie policy and reversible Meta Pixel consent.
- Meta Pixel remains disabled in authenticated routes and before opt-in.
- Data-rights/deletion request procedure.

## Must be completed before broad paid production

### Corporate identification

Replace temporary contact data once available and add the actual legal details to the public legal documents:

- registered legal name / business form;
- RUT or other applicable tax identifier;
- legal/business address;
- corporate support/privacy email under the final domain.

Do not publish placeholders as if they were real corporate data.

### Uruguay personal-data compliance

Obtain professional confirmation of the obligations applicable to RevScale and each processing role under Uruguay's personal-data framework, including as relevant:

- identification of RevScale as controller for its own account/billing/security data and processor/provider for client lead data;
- processing agreements with customer organizations;
- database registration or other formalities before the URCDP where applicable;
- international transfers and subprocessors;
- incident-response and notification duties;
- procedures for access, rectification, deletion and consent withdrawal.

### Subprocessors

Maintain an internal list containing at least the service, purpose, category of data and relevant location/transfer information for providers actually enabled in production. Expected providers may include Supabase, Vercel, Paddle, Meta/WhatsApp and OpenAI, but the list must reflect the live configuration rather than planned integrations.

### WhatsApp / Meta

Before enabling live outbound automation:

- complete Meta Business / app requirements;
- use the final verified domain where Meta requires it;
- document the opt-in source for business-initiated messages;
- honor opt-outs and do-not-contact instructions;
- do not interpret a service inquiry as unlimited marketing consent;
- ensure templates and message categories comply with current WhatsApp rules.

### Billing / Paddle

Before switching billing from sandbox/demo to live:

- replace sandbox API keys, webhook secrets and price IDs with live values;
- verify the checkout displays RevScale/product, amount, currency, billing cycle, taxes and recurring nature correctly;
- verify Paddle/Merchant-of-Record disclosures in checkout and receipts;
- test first purchase, renewal, payment failure, plan change and cancellation;
- provide a working cancellation path before charging customers at scale;
- replace the temporary Gmail support address with the corporate domain address.

### Professional validation

Before large-scale launch, have a Uruguay-qualified lawyer review the final legal identity, customer agreement/privacy roles and any consumer-law implications, and have an accountant/tax professional confirm invoicing/tax treatment with Paddle as Merchant of Record.
