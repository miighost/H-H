# Actual V48 API entry points

This inventory is extracted from runtime code. Historical backend/openapi.yaml is an earlier design contract; these are the implemented paths. Body validation and access rules are enforced in the source indicated.

| Method | Path | Access | Source |
|---|---|---|---|
| GET | `/api/operations/workspace` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| POST | `/api/operations/account` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| POST | `/api/operations/orders` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| GET | `/api/operations/orders/:id` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| POST | `/api/operations/orders/:id/assign` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| POST | `/api/operations/orders/:id/status` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| GET | `/api/operations/orders/:id/proof` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| POST | `/api/operations/payments` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| POST | `/api/operations/orders/:id/apply-credit` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| POST | `/api/operations/inventory/:id` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| POST | `/api/operations/accounts/:uid/credit` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| POST | `/api/operations/equipment` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| POST | `/api/operations/orders/:id/location` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| GET | `/api/operations/prospects` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| POST | `/api/operations/prospects` | existing Firebase identity and server role/ownership | `backend/runtime/api.mjs` |
| POST | `/api/operations/settings/retail-pricing` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/inventory/:id/tiers` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| GET | `/api/operations/drivers` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| GET | `/api/operations/staff` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/staff` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/staff/:uid/disable` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| GET | `/api/operations/modules` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/alerts/:id/acknowledge` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/orders/:id/destination` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/orders/:id/locations` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| GET | `/api/operations/orders/:id/route-history` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/routes/plan` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| GET | `/api/operations/routes/current` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/intakes` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/batches` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/batches/:id/advance` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/attendance/config` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/attendance/shift` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/attendance/punch` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| GET | `/api/operations/attendance/:id/photo` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/visits` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/prospects/:id/activate` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/trials` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/trials/:id/reconcile` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/executive-notes` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/accounts/:uid/pricing` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/equipment/:id/return` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/expenses` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/forecasts` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/orders/:id/cancel` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/operations/orders/:id/issue` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| GET | `/api/operations/exports/:kind` | existing Firebase identity and server role/ownership | `backend/runtime/advanced.mjs` |
| POST | `/api/waafi/webhook` | signed gateway webhook | `backend/runtime/payments.mjs` |
| POST | `/api/operations/orders/:id/checkout` | existing Firebase identity and server role/ownership | `backend/runtime/payments.mjs` |
| POST | `/api/operations/orders/:id/reconcile-payment` | existing Firebase identity and server role/ownership | `backend/runtime/payments.mjs` |
| GET | `/api/public/prices` | public request/prices | `backend/runtime/public-requests.mjs` |
| POST | `/api/public/requests` | public request/prices | `backend/runtime/public-requests.mjs` |
