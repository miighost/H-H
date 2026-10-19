> Historical/reference document. For current behaviour and deployment, use ENGINEER_START_HERE_V48.md and verification/V48_RESULTS.md. Earlier completion wording is not current release evidence.

> Historical V46 material. Read `CONNECTED_HANDOVER_V47.md` and `V47_VERIFICATION.md` first. This document is not evidence that production operational services are commissioned.

# Horn & Harvest — A–Z Go-Live Checklist

## 1. Freeze and backup

- [ ] Record the supplied Git revision and ZIP checksum.
- [ ] Back up the old site, database, uploaded files, environment values and complete DNS zone.
- [ ] Test a rollback before changing production.
- [ ] Deploy the exact reviewed revision; do not rebuild from copied snippets.

## 2. Brand and content

- [ ] Exact official transparent logo; no redraw, white box, stretching or recolouring.
- [ ] Palette remains `#1C3B2F`, `#F5F0E1`, `#D4AF37` and restrained charcoal/ivory.
- [ ] Master line remains `Dhadhanka Awoowayaasheen — The Taste of Our Ancestors.`
- [ ] Exactly five names: Mango; Papaya; Banana - Lady Soft; Banana - Lady Spicy; Isbaandheys.
- [ ] Official pouch imagery only; correct Isbaandheys fruit/window.
- [ ] No sun-dried, no-additives, unverified certification, health, medical, export-readiness or absolute sourcing claims.
- [ ] No preview, test or internal-builder wording on the public homepage.

## 3. Domain and hosting

- [ ] Stage first on a non-indexed hostname.
- [ ] Preserve Horn & Harvest email DNS records when changing web hosting.
- [ ] Configure apex and `www` intentionally with one canonical destination.
- [ ] HTTPS only; no mixed content.
- [ ] Canonical, visible domain and metadata all resolve to `https://hornandharvest.com/`.
- [ ] Production is indexable only after final approval; staging remains non-indexable.

## 4. Public-page functions

- [ ] All navigation anchors land correctly without hidden headings.
- [ ] Somali/English switch updates visible copy and document language.
- [ ] Telephone and email actions use verified company details.
- [ ] Company Profile PDF opens successfully on iPhone, Android and desktop.
- [ ] Catalogue/social links remain absent until approved real destinations exist.
- [ ] Retail totals, delivery charge and availability wording match approved commercial terms.
- [ ] Business-account request explains that the sales team verifies access.
- [ ] No dead `#` links or clickable-looking inert cards.

## 5. Customer and order commissioning

- [ ] Configure the correct Firebase project and review Firestore/Auth rules.
- [ ] Replace any demonstration users and records with controlled production data.
- [ ] Enforce customer/admin/warehouse/driver/CEO authorization on the server.
- [ ] Create the durable order before payment and use idempotent references.
- [ ] Prevent overselling with transactional stock reservation and one-time deduction.
- [ ] Verify order, invoice and delivery history across two devices.
- [ ] Verify invoice values are pulled from real order/payment records; demonstration invoices must remain labelled.

## 6. Payment gate

- [ ] Keep `VITE_PAYMENTS_ENABLED=false` until every item below passes.
- [ ] Configure merchant credentials only in encrypted server environment settings.
- [ ] Validate amount, currency, order reference and provider response on the server.
- [ ] Implement signed callback/status verification, retries, reconciliation and failure recovery.
- [ ] Never treat a browser return URL as proof of payment.
- [ ] Complete provider sandbox and controlled production acceptance tests.

## 7. Operations and security

- [ ] Keep CEO/admin/operations routes out of public navigation.
- [ ] Require verified server identity and role checks for every protected route and API.
- [ ] Move browser-local demonstration data to the approved server database.
- [ ] Secure proof-of-delivery and attendance images in private storage with retention controls.
- [ ] Configure server time, audit events, premises radius and approved network checks for attendance.
- [ ] Test simultaneous stock/order activity and rollback on failure.
- [ ] Confirm backup/restore and audit retention.

## 8. Device and accessibility matrix

- [ ] iPhone/Safari and Android/Chrome real-device tests.
- [ ] macOS Safari/Chrome and Windows Chrome/Edge.
- [ ] Tablet portrait/landscape around 900 px.
- [ ] Widths 1440, 1280, 1024, 900, 768, 430, 390, 375 and 320 px.
- [ ] 200% text zoom, keyboard-only order and visible focus.
- [ ] No horizontal overflow, clipped logo, fruit, pouch, video or button text.
- [ ] Meaningful alt text and comfortable touch targets.

## 9. Assets, performance and metadata

- [ ] Compare official logo and pouch files with supplied masters.
- [ ] Generate non-destructive WebP/AVIF responsive derivatives; preserve original masters.
- [ ] Reserve image dimensions and lazy-load only below-the-fold assets.
- [ ] Zero critical console errors and zero failed critical network requests.
- [ ] Confirm title, description, canonical, robots, favicon and language metadata.
- [ ] Add an owner-approved Open Graph/share image before marketing the URL.
- [ ] Do not expose secrets, private personal data, draft documents or staging endpoints.

## 10. Release and handback

- [ ] Deploy the same revision that passed staging.
- [ ] Open the production URL privately/incognito and repeat the smoke test.
- [ ] Confirm domain redirects, TLS, public documents and contact actions.
- [ ] Monitor errors immediately after launch.
- [ ] Keep rollback for at least seven days.
- [ ] Send the owner: production URL, release revision, device results, backup/rollback confirmation, link/document results and every exception. No silent failures.

