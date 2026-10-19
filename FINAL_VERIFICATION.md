> Historical/reference document. For current behaviour and deployment, use ENGINEER_START_HERE_V48.md and verification/V48_RESULTS.md. Earlier completion wording is not current release evidence.

> Historical V46 material. Read `CONNECTED_HANDOVER_V47.md` and `V47_VERIFICATION.md` first. This document is not evidence that production operational services are commissioned.

# Horn & Harvest — Final Verification Record

Review date: 20 September 2026.

## Confirmed in the supplied candidate

- Public site and source revision correspond to the same locked Group 1–5 candidate.
- Public access is enabled on the review URL.
- Production build completes.
- TypeScript check completes after final technical corrections.
- Public homepage renders with one H1, Somali as the default language and no horizontal overflow in the inspected browser viewport.
- Title is `Horn & Harvest | Premium Naturally Dried Somali Fruits`.
- Official logo, hero and story images load in the public browser inspection.
- Product names and visible public copy match the locked five-product family.
- Company Profile points to the bundled PDF.
- Public telephone and email use the approved company details.
- CEO token tests deny forged, wrong-project, expired, unverified and disabled users and accept the verified CEO case.
- No public navigation link exposes operations or CEO routes.

## Automated commands

Run from the repository root:

```text
npm ci
npm run lint
npm run build
node --test tests/ceo-auth.test.mjs
node --import tsx tests/demo-workflow.ts
node --import tsx tests/tracking.ts
```

## Engineer-only acceptance still required

- Real iOS/Safari, Android/Chrome, desktop Safari/Chrome/Edge and tablet matrix.
- Final-domain DNS/TLS and old-site replacement.
- Production Firebase/payment/storage/messaging/GPS credentials and external-service acceptance.
- Approved Open Graph/social share image.
- Non-destructive responsive image optimization.

The package is a complete engineering handover. It is not evidence that unconfigured external services are already live.
