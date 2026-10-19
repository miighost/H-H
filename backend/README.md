> Historical/reference document. For current behaviour and deployment, use ENGINEER_START_HERE_V48.md and verification/V48_RESULTS.md. Earlier completion wording is not current release evidence.

# Horn & Harvest production backend handover

This directory is the source of truth for commissioning the customer, warehouse,
driver and CEO workflow. It does not replace the approved website design.

## Contents

- `openapi.yaml` — versioned HTTP contract.
- `DATA_MODEL.md` — database collections, invariants and indexes.
- `ROLE_PERMISSIONS.md` — least-privilege access matrix.
- `EVENT_WORKFLOW.md` — order, stock, delivery and notification transitions.
- `COMMISSIONING.md` — exact implementation and acceptance sequence.

## Architecture decision

Use Firebase Authentication for identity and server-verified role claims. Use one
authoritative server API for all business mutations. Firestore may remain the
operational database, but clients must not directly change orders, stock,
payments, delivery completion or staff roles.

The browser UI may read permitted views. Every state transition is enforced by
the API, recorded in an append-only audit event and protected with an
`Idempotency-Key`.

## Non-negotiable rules

1. An order is reserved transactionally; never sell unavailable stock.
2. Physical stock is deducted once, at dispatch, using an idempotent transaction.
3. Delivery cannot complete without proof photo and receiver signature or name.
4. Customers can see only their own orders, invoices and delivery records.
5. Drivers can see only assigned deliveries.
6. Warehouse users cannot grant roles or alter payment confirmation.
7. CEO access is server-authorized using a verified account and assigned role.
8. Payment webhooks are verified server-side before an order becomes paid.
9. Location collection runs only during an active delivery and follows the
   configured retention period.
10. Demonstration records must never be migrated into production.
