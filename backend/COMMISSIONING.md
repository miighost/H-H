# Engineer commissioning sequence

1. Create separate staging and production Firebase projects.
2. Configure Firebase Authentication and server-managed custom role claims.
3. Create the collections and indexes in `DATA_MODEL.md`.
4. Implement and deploy `openapi.yaml`; do not permit direct client writes for
   protected business records.
5. Configure allowed origins, rate limits, structured logs and secret storage.
6. Connect verified payment callbacks; keep payments disabled until replay and
   signature tests pass.
7. Wire the existing customer, warehouse, driver and CEO screens to the API.
8. Configure protected object storage for proof photos, signatures and invoices.
9. Add scheduled retention deletion for location records.
10. Seed only official products and specifically approved staff/customer users.
11. Run every acceptance scenario below in staging.
12. Back up the old site and data, deploy the identical tested revision, and
    repeat the smoke tests on production.

## Mandatory acceptance scenarios

- Customer cannot read another customer’s order or invoice.
- Driver cannot read an unassigned delivery.
- Warehouse cannot confirm payment or grant roles.
- Concurrent orders cannot reserve more stock than exists.
- Repeated dispatch requests deduct stock only once.
- Delivery cannot complete without both required proof fields.
- Replayed payment or proof requests do not duplicate events.
- Offline tracking events synchronize once in timestamp order.
- Low-stock crossing alerts warehouse and CEO; acknowledgement is audited.
- Invoice totals equal the immutable accepted order/payment snapshot.
- Disabled users and expired tokens are rejected.
- CEO access works only for the verified authorised account and assigned role.
- All important actions have request IDs and append-only audit records.
