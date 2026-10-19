> Historical/reference document. For current behaviour and deployment, use ENGINEER_START_HERE_V48.md and verification/V48_RESULTS.md. Earlier completion wording is not current release evidence.

# Horn & Harvest — Connected Core Repair V47

Start here. This supersedes earlier completion claims, not the approved brand design.

## What changed

The public landing page retains its approved artwork, copy and visual system.
Its trade entry opens `/trade`, and customer sign-in opens `/customer`.
The state-only legacy dashboard and static workflow are no longer public entry points.

The connected account is implemented in `src/components/ConnectedPortal.tsx`.
The production API is implemented in `backend/runtime/api.mjs`, not just described
in an API specification. Business rules are isolated in `backend/runtime/domain.mjs`.
`server.mjs` mounts the API and serves the compiled website with SPA fallback.

## Working code paths

- Firebase email/password login using the existing Firebase identity system.
- Customer registration and server-owned business profile.
- Direct URLs, browser Back and reload for overview, order history, new order,
  order details, tracking, invoice, account/payments, inventory and equipment.
- Multi-product orders priced by server stock records; integer-cent calculations.
- Transactional stock reservations and prevention of overselling.
- Idempotent order creation and verified external-receipt entry.
- Customer account balances, account deposits, approved credit facilities,
  order payment allocation and payment history.
- Shared warehouse order records; driver assignment and delivery windows.
- Controlled order stages from confirmation through delivered.
- Physical stock deducted once at dispatch; both customer and staff see the update.
- Delivery completion requires photo storage and receiver full name.
- Persistent departure/delivery notifications in the order history.
- Invoice view/PDF after delivery, using the actual order lines and recorded payments.
- Customer-visible equipment assignment/ownership records.
- Current driver GPS submission during an assigned active delivery only.
- Low-stock views use the same inventory records for warehouse and CEO/admin.

## Honest remaining boundary

This is not proof of a fully commissioned live operational system. Production
Firebase Auth, Firestore and Storage were not accessed during repair testing.
Tests use isolated test repositories and identities; production contains no
sample-account bypass and does not seed orders, stock or money.

No automatic gateway settlement is represented as working. Receipts are recorded
by an authorised administrator only after external verification. Customer payment
redirects cannot mark an order paid. WAAFI remains disabled unless specifically
commissioned; its existing checkout must not be enabled until verified callbacks
are implemented and tested against stored orders.

Automatic live ETA, continuous route-history replay, offline/background GPS,
route optimisation, automatic delay escalation, full production attendance,
full field-sales workflows are NOT
claimed as newly completed by this core repair. Original sources are retained
for reference; legacy browser-local demonstrations must not be deployed as real
operational modules. The `/ceo` route presents the five folder names (Today’s Work, Prospect Hub,
Business Snapshot, Market Intelligence, Reference Library) with recorded-data
views. These do not implement every original intelligence module. The original
five-folder artwork/source remains in `private/ceo-desktop.html`.

## Engineer setup — Node hosting required for connected account functions

1. Back up the existing server, database, files and DNS.
2. Use a supported Node.js runtime (20+). Run `npm ci`, `npm run lint`,
   `node --test tests/connected-domain.test.mjs tests/connected-api.test.mjs`,
   then `npm run build`.
3. Configure the SAME Firebase project for browser and Admin SDK. Supply the
   `VITE_FIREBASE_*` values before building. Configure
   `FIREBASE_SERVICE_ACCOUNT_BASE64` only on the server, plus
   `PROOF_OF_DELIVERY_STORAGE_BUCKET` and
   `CEO_AUTHORISED_EMAIL=info@hornandharvest.com`.
4. Start `npm start` as a managed long-running process. Proxy HTTPS domain
   requests to its PORT. Merely copying `dist` to PHP/shared hosting gives the
   presentation only, not the `/api/operations` service.
5. Create authorised staff in Firebase Authentication. Run, on a trusted server:
   `node --env-file=.env.local scripts/set-role.mjs staff@example.com warehouse`
   (role options: customer, warehouse, driver, sales, admin, ceo).
   Never permit browser users to grant themselves roles. CEO additionally requires
   the configured email and Firebase-verified email. Sign out/in after changing claims.
6. Review `firestore.rules`. The new service uses Admin SDK only; browser
   business-data access is denied. Plan legacy data migration before deploying
   these rules to a project used by the old website. This closes previously public
   order/profile writes and plaintext-password lookups. Never copy old password
   fields into the new account collections.
7. New authoritative collections are `hhAccounts`, `hhInventory`, `hhOrders`,
   `hhPayments`, `hhEquipment`. Migrate verified old balances/records with an audit
   trail, not fabricated opening values. Configure real prices and physical stock
   through the warehouse view before accepting orders.
8. Customer routes: `/customer/overview`, `/customer/new-order`,
   `/customer/orders`, `/customer/orders/ORDER_ID`,
   `/customer/orders/ORDER_ID/tracking`, `/customer/orders/ORDER_ID/invoice`,
   `/customer/account`, `/customer/equipment`.
9. Staff routes: `/operations/overview`, `/operations/orders`,
   `/operations/stock`, `/operations/account`, `/operations/equipment`.
   Assigned driver routes use `/driver`; CEO/admin reports use `/ceo`.
   Role access is enforced at the API, not trusted from a client profile.
10. Test a staging order using real authorised staging identities: create stock,
    register buyer, order, record receipt, prepare, mark ready, assign driver,
    dispatch, arrive, upload proof, invoice, then reload from another device.
    Verify actual Firestore records and Storage permissions. Test iPhone/Safari
    and Android/Chrome physically, including PDF download and camera capture.
11. Keep payments and public commerce closed until production smoke tests pass.
    Never expose service-account credentials, source ZIPs or private files under
    the public document root. Keep rollback available.

## API route contract for this repair

All `/api/operations` endpoints require a Firebase ID token in the Bearer header.

| Method | Path | Purpose |
|---|---|---|
| GET | /workspace | Role-filtered accounts/orders/stock/payments/equipment |
| POST | /account | Save own business details |
| POST | /orders | Reserve stock and record customer order (Idempotency-Key required) |
| GET | /orders/:id | Read permitted order |
| POST | /orders/:id/assign | Assign verified driver and delivery window |
| POST | /orders/:id/status | Controlled stage transition; proof required for delivery |
| GET | /orders/:id/proof | Protected delivery-photo retrieval |
| POST | /orders/:id/location | Assigned active driver's current GPS position |
| POST | /orders/:id/apply-credit | Allocate existing account credit to order |
| POST | /payments | Admin/CEO records verified external receipt/deposit |
| POST | /inventory/:id | Warehouse/admin configures physical stock and approved price |
| POST | /accounts/:uid/credit | Admin/CEO sets approved credit limit |
| POST | /equipment | Staff records equipment ownership/assignment |
| GET/POST | /prospects | Sales/CEO/admin prospect records |

Older `backend/openapi.yaml` is the wider commissioning specification. It is
not the endpoint contract for this repaired core. Do not assume every older
specified endpoint exists.
