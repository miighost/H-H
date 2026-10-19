# Horn & Harvest — connected system V48

This is a source-and-build handover, not a claim that the live domain has already been replaced. Start here. Earlier V46/V47 reports are historical. The current implementation lives in `src/`, `backend/runtime/`, `server.mjs` and `native-driver/`.

## What is included

- Approved public website and original identity/product/media assets; no new creative direction.
- Customer accounts, placed orders, reorder, persisted status notifications, tracking, completed-order invoices and PDF export.
- Server-priced 24-pouch-box orders; quantity tiers and per-customer contract prices; reservation prevents overselling. Physical stock leaves at dispatch. Cancellation releases reservations; recorded payments become account credit.
- Verified receipt/deposit ledger, order allocation, outstanding balances and owner-set credit limits. Browser callbacks cannot mark an order paid.
- Warehouse preparation, registered-driver assignment, delivery windows, coordinates, required handover photo and receiver full name.
- GPS event outbox and route history/replay. Driver sees assigned orders; customers see their own records. A customer tracking link requires that same customer's existing login.
- Fleet coordinate plot, route sequence and ETA. Without self-hosted road routing, estimates are explicitly labelled straight-line estimates; no live-traffic promise.
- Shared low-stock and delay alerts for warehouse and CEO. Delay updates appear in the customer's account history; no external SMS/email service is introduced.
- Supplier intake, raw inventory, production steps, yield and finished-stock release; field visits, prospects, trial-stock issue/return, equipment return and supply planning.
- CEO's five primary folders remain: Today’s Work, Prospect Hub, Business Snapshot, Market Intelligence, Reference Library. Records, costs, pricing and staff access are subordinate tools.
- Premises attendance with server timestamps, GPS radius, approved network IP, camera snapshot, shift labels, absence records and CSV export. GPS/IP/photo improve evidence; they cannot guarantee that cheating is impossible.
- Website retail/trade enquiries save to the sales queue and return a reference. Public prices are shown only after an owner saves approved pricing. Enquiries do not fabricate a paid order.
- Waafi hosted checkout adapter, HMAC webhook verification, durable events, server verification, reconciliation and reversal records. Merchant commissioning remains mandatory.
- Own-server SQLite business database and protected photo files (Node 24); existing Firebase identity remains the one login/security system. Firestore remains an optional existing-data-store adapter.
- Flutter driver source with background location permissions, SQLite outbox, assigned-delivery stages and proof capture. This is NOT a signed IPA/APK.
- Source, dependency lock, rebuilt `dist`, automated tests, browser evidence, route migration audit, container configuration, preflight and backup script.

## Install / run: one managed Node service

1. Keep a rollback copy of the existing website, database and credentials. Do not overwrite the only working version.
2. Install Node 24 LTS. Extract the complete ZIP into a private application directory; run `npm ci` there.
3. Copy `.env.example` to `.env` and fill the EXISTING Firebase project's browser settings and server service-account credentials. Browser and server project IDs must match. Enable the existing Email/Password provider and authorised production domain. Never add a second identity system.
4. Set `CEO_AUTHORISED_EMAIL=info@hornandharvest.com`; grant roles with `node scripts/set-role.mjs EMAIL ROLE`. CEO identity must also have a verified email. Never trust a role supplied by a browser.
5. Set `DATA_BACKEND=sqlite`, a private writable `DATA_DIRECTORY`, `PUBLIC_BASE_URL=https://hornandharvest.com` and the correct `TRUST_PROXY` for your proxy topology. Use ONE managed Node process for this SQLite deployment. Back up its persistent disk; do not put it under `public` or `dist`.
6. Run `npm run lint`, `npm test`, `npm run build`, then `npm start`. Vite `dev` alone does NOT host the API. `.env` is the dotenv runtime file; `.env.local` alone is insufficient for Node runtime configuration.
7. Reverse-proxy the existing HTTPS domain to this service's port 3000. Use `deploy/nginx.conf` as a vhost example, adapting actual certificate paths. Keep the API and website same-origin. Uploading only `dist` to PHP/static hosting cannot run orders or records and is NOT this deployment.
8. Alternative: `docker compose --env-file .env up -d --build`. Keep the named data volume. Do NOT use `down -v`. Docker/container execution was not available for validation here; Node lint, build and API tests were run directly.
9. Apply roles and configure real stock, approved box prices, credit limits, attendance premises/shift data and optional public retail prices through the protected portal. No test stock, sample customers, invented balances or fake receipts are seeded in production.
10. For Waafi, commission the merchant settings, hosted-checkout contract and signed webhook at `/api/waafi/webhook`, then run approved/declined/repeated/reversed/timeout tests before setting `PAYMENTS_COMMISSIONED=true`. A Creating/Pending attempt blocks a fresh charge for that order: reconcile before retrying. An ambiguous gateway timeout must be investigated; do not reset it blindly.
11. For road-based routing, set `OSRM_URL` to your self-hosted OSRM HTTP(S) service with the relevant road data. UK/Somalia geography needs the appropriate datasets. Without it, displayed estimates are distance-based, not traffic-aware ETAs.
12. Build the native driver using `native-driver/README.md` and `bootstrap.sh`. Supply the same Firebase project's platform-specific app IDs, enable platform permissions/capabilities, sign the builds and test them on actual iOS and Android devices. Flutter SDK and devices were unavailable here; this source has NOT been compiled or device-tested.
13. Run the checks below against the deployed environment and do a private-session/public-domain smoke test. Only then replace the old site / announce live readiness.

## Where each user goes

Public `/`; trade information `/trade`; customer `/customer`; warehouse `/warehouse`; driver `/driver`; sales `/sales`; CEO `/ceo`; administrative access `/admin`; attendance `/staff-attendance`.

Within a signed-in customer's order: Track Delivery, Invoice (after delivery), Reorder. Tracking links are `/track/ORDER_ID`, which route to an ownership-protected customer tracking page. A legacy demo link now opens the real protected workspace. It no longer uses shared sample records.

## Record boundaries you must not misrepresent

Trial stock reconciliation records sold/returned/wasted quantities; it does not invent a payment or invoice. A real customer sale and verified receipt must be recorded through the order/payment workflow. Market research/strategy/meetings are persisted executive records, not an unconfigured autonomous AI service. The fleet plot is a coordinate view, not a supplied street-tile server. Browser GPS is foreground-capable; reliable locked-screen tracking requires the native module and device validation. Attendance captures evidence, not biometric identity verification. No app-store readiness, legal-certification readiness, real-device certification, automatic external SMS or live merchant transaction is claimed.

## Test / release boundary

See `verification/V48_RESULTS.md`. For repeatable browser checks, install Chromium with `npx playwright install chromium`, then run `npm run test:browser`. The test launches an isolated local API with test-only identities; it is not a production login bypass. Local browser verification uses isolated test identities; production always verifies existing Firebase tokens. Local API tests include actual SQLite persistence and filesystem photo storage. Real Firebase credentials, merchant credentials, physical devices, hosting certificates and actual existing business data were not available here. Julian owns configuration, any existing-data migration, infrastructure and deployment acceptance; the source does not remove those obligations.

## Backup and rollback

Stop the service before a consistent full database-and-photo backup. Run `npm run backup -- /PRIVATE_BACKUP_PATH` with the same DATA_DIRECTORY. Keep `.env`/service credentials separately and privately. Restore the saved SQLite file as `horn-harvest.sqlite` and its matching `proof` folder with the service stopped, retaining private ownership/permissions; do not retain stale WAL/SHM files from another snapshot. Keep the old application release and revert the proxy to it if deployment smoke tests fail. Do not use chmod 777.

## Required deployed acceptance

Customer register/sign-in -> account -> order -> verified receipt/credit -> warehouse prepare/ready -> driver assignment -> dispatch/GPS -> arrival -> required proof -> customer notification/invoice/PDF -> reorder. Check account balance/stock before and after and replay duplicate requests. Then test wrong-account access, disabled identity, absent configuration, gateway signature failure, partial refund, unavailable stock, browser Back/reload/deep link, offline reconnect, GPS/camera denial, 320–1920px widths and real iPhone/iPad/Android/desktop browsers. Do not claim a final production pass from responsive code alone.
