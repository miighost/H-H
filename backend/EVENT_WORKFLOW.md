# Connected workflow

## Order state machine

`DRAFT → AWAITING_PAYMENT → CONFIRMED → PREPARING → READY_FOR_COLLECTION →
DISPATCHED → EN_ROUTE → ARRIVED → DELIVERED`

Exception states: `WAITING_FOR_STOCK`, `DELIVERY_ISSUE`, `CANCELLED`,
`REFUNDED`. Every transition is server-authorized and appended to
`orderEvents`.

## Connections

1. Customer submits an order.
2. Server validates prices and reserves stock transactionally.
3. Verified payment changes the order to `CONFIRMED`.
4. Warehouse sees it in the preparation queue.
5. Warehouse marks it `PREPARING`, then `READY_FOR_COLLECTION`.
6. Assignment creates a delivery, driver/time slot and route position.
7. Driver sees only that assigned delivery.
8. Dispatch deducts physical stock once and creates the customer notification:
   “Your order has left the warehouse — on the way.”
9. Driver tracking updates ETA while the delivery is active.
10. Arrival creates an in-account notification.
11. Photo plus signature/full name unlocks delivery completion.
12. Completion creates the final order event, invoice availability and customer
    notification: “Your order has been delivered — complete.”
13. Warehouse sees reconciled stock; CEO sees reports and exceptions
    automatically.

## Low-stock event

When available stock crosses its threshold, one event is sent simultaneously to
warehouse and CEO views. Warehouse owns the operational response. CEO monitors
acknowledgement, escalation and resolution without duplicating warehouse work.

## Offline delivery

Driver location and proof actions use client-generated event IDs. The device
queues them locally and retries in original timestamp order. The server rejects
duplicates using the event ID and `Idempotency-Key`.
