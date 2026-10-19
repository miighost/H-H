# Current release: Connected System V48

Read `ENGINEER_START_HERE_V48.md` first. It supersedes earlier deployment/completion wording. Current runtime code is included; production credentials and real-device/native build validation remain mandatory.

# Current handover: Connected Core Repair V47

Read `CONNECTED_HANDOVER_V47.md` first. It states implemented behaviour, test boundaries, deployment steps and unfinished commissioning requirements. Earlier completion wording below is historical and must not be read as proof of a live connected system.

# Horn & Harvest

Locked production-candidate source for the Horn & Harvest public website and its connected demonstration/engineering surfaces.

## Approved public build

- Brand palette: Deep Harvest Green `#1C3B2F`, Warm Cream `#F5F0E1`, Metallic Gold `#D4AF37`.
- Products: Mango, Papaya, Banana - Lady Soft, Banana - Lady Spicy and Isbaandheys.
- Master line: `Dhadhanka Awoowayaasheen — The Taste of Our Ancestors.`
- Canonical production domain: `https://hornandharvest.com/`.

Do not redesign, regenerate the official logo or pouch artwork, add unsupported claims, or publish certifications without formal approval.

## Local setup

Prerequisite: current Node.js LTS.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and supply production values securely. Never commit secrets.
3. Run `npm run lint`.
4. Run `npm run build`.
5. Run `npm run dev` for local review.

## Production boundaries

The public marketing page builds as a Vite application. Authentication, payments, durable orders, GPS, delivery tracking, attendance, warehouse records and notifications require production credentials, server-side enforcement and acceptance testing. Demonstration routes and browser-local records are not a substitute for commissioned backend services.

The complete production integration contract is in `backend/`. Start with
`backend/README.md`, then implement `backend/openapi.yaml` against the data,
permissions and workflow rules supplied beside it.

Keep `VITE_PAYMENTS_ENABLED=false` until payment verification, persistent order creation, callbacks, reconciliation and failure recovery have been implemented and tested.

See `ENGINEER_HANDOVER.md`, `DEPLOYMENT_CHECKLIST.md` and `FEATURE-AUDIT.md` before production deployment.
