# Production data model

Every record includes `createdAt`, `updatedAt`, `version` and actor/audit
metadata. Money is stored as integer minor units with an ISO currency.

## Collections

- `users/{uid}`: email, displayName, phone, status, roleIds, customerId.
- `roles/{roleId}`: customer, sales, warehouse, driver, CEO or admin.
- `customers/{customerId}`: trading name, type, contacts, addresses,
  approvalStatus and assignedSalesUserId.
- `products/{productId}`: official SKU, exact name, pack size and active flag.
- `inventory/{productId}`: physical, reserved, available, threshold and version.
- `inventoryMovements/{movementId}`: product, quantity, reason, order/batch
  reference and actor. Append-only.
- `orders/{orderId}`: customer, lines, totals, payment, delivery window, status
  and version.
- `orderEvents/{eventId}`: order, previous/new status, actor, timestamp and note.
- `batches/{batchId}`: fruit, supplier lot, fresh input, output, rejects, QC and
  release status.
- `deliveries/{deliveryId}`: order, driver, route sequence, status, ETA,
  tracking consent window and proof status.
- `locationEvents/{eventId}`: delivery, driver, latitude, longitude, accuracy
  and capturedAt; expire by retention policy.
- `proofsOfDelivery/{proofId}`: delivery, protected photo object, receiver name,
  signature object, capturedAt and integrity hash.
- `invoices/{invoiceId}`: order snapshot, sequential invoice number, totals,
  payment status and immutable PDF object reference.
- `notifications/{notificationId}`: recipient, order/delivery, type, body,
  readAt and createdAt.
- `attendance/{attendanceId}`: staff, shift, sign-in/out, location result and
  protected photo reference.
- `auditEvents/{eventId}`: actor, role, action, entity, before/after hashes,
  requestId and timestamp. Append-only.

## Transaction invariants

- `available = physical - reserved` and must never be negative.
- Order confirmation reserves all lines atomically or reserves none.
- Cancellation releases a reservation exactly once.
- Dispatch converts reservation into one physical deduction exactly once.
- Delivery completion does not alter stock a second time.
- Invoice totals are a server-generated snapshot of the accepted order/payment.
- Status changes require the current expected version to prevent lost updates.

## Required indexes

- orders: customerId + createdAt descending
- orders: status + deliveryWindow.start
- deliveries: driverId + status + scheduledAt
- notifications: recipientUid + createdAt descending
- inventoryMovements: productId + createdAt descending
- orderEvents: orderId + createdAt
- locationEvents: deliveryId + capturedAt
- auditEvents: entityType + entityId + createdAt
