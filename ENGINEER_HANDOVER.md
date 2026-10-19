> Historical/reference document. For current behaviour and deployment, use ENGINEER_START_HERE_V48.md and verification/V48_RESULTS.md. Earlier completion wording is not current release evidence.

> Historical V46 material. Read `CONNECTED_HANDOVER_V47.md` and `V47_VERIFICATION.md` first. This document is not evidence that production operational services are commissioned.

# Horn & Harvest — Complete Engineer Handover

## Release identity

- Release name: Horn & Harvest locked production candidate
- Final handover review: 20 September 2026
- Intended production domain: `https://hornandharvest.com/`
- Public reference candidate: `https://horn-harvest-premium-preview.afrahmig2022.chatgpt.site/`

This repository contains the complete locked public website plus the connected customer, invoice, operations, delivery, attendance and CEO demonstration/engineering surfaces created during the project. The approved public design must not be redesigned or rewritten during deployment.

## Included surfaces

- Bilingual Somali/English public website.
- Official logo and approved product/brand imagery.
- Story, five-product collection, standards, production journey and packaging films.
- Company Profile PDF.
- Retail order interface and business-account request journey.
- Customer sign-in/account source, order history, invoice view/PDF source and delivery status source.
- Master operations blueprint covering warehouse, production, stock, orders, drivers, field sales, customers, growth and CEO visibility.
- Proof-of-delivery, delivery timeline, stock synchronization and attendance demonstration source.
- CEO Desktop source and server-side CEO token validation tests.
- Firebase integration points, rules, Node server and worker source.
- Production backend contract in `backend/`: OpenAPI endpoints, database model,
  role permissions, event workflow and commissioning acceptance tests.
- Group 1–5 content and production corrections represented in the locked public build.

## Truthful production boundary

The public presentation is deployable. External operational services are not made real merely by publishing frontend code. The following require production engineering and credentials:

- Firebase project review and secure role rules.
- Durable order, inventory, invoice and notification records.
- Server-verified payment creation, callbacks and reconciliation.
- GPS/background tracking and customer live-map delivery service.
- Secure delivery photographs/signatures and staff photographs.
- Premises/IP attendance enforcement and server time.
- Route optimization using a commissioned mapping/routing service or an approved self-hosted engine.
- Real email/message delivery and verified social destinations.
- Final approved catalogue file and social-share/Open Graph image.

The API contract in `backend/openapi.yaml` is the authoritative integration
boundary for the approved customer, warehouse, driver and CEO screens. Do not
invent a competing workflow or expose protected business mutations directly to
the browser.

Do not represent a browser-local demonstration as a commissioned live system. Do not expose CEO, warehouse, driver or admin routes until server-side authorization has been configured and tested.

## Install and verify

Use a current Node.js LTS release.

1. Copy `.env.example` to `.env.local` and provide secrets through the hosting provider—not source control.
2. Run `npm ci`.
3. Run `npm run lint`.
4. Run `npm run build`.
5. Run the automated test commands recorded in `FINAL_VERIFICATION.md`.
6. Review locally with `npm run dev`.

## Deployment rule

Back up the existing website, database, uploads, environment variables and DNS records before replacing the old site. Test this exact revision on staging. Deploy the identical tested revision to production, then repeat the smoke test in an incognito session and on real iPhone/Safari and Android/Chrome devices.

Keep payments disabled until the payment gate in `DEPLOYMENT_CHECKLIST.md` passes. Preserve the old site as a tested rollback for at least seven days.
