# Role permissions

| Capability | Customer | Sales | Warehouse | Driver | CEO | System |
|---|---:|---:|---:|---:|---:|---:|
| View own orders/invoices | Yes | Assigned accounts | No | Assigned summary | Yes | Yes |
| Create customer order | Yes | Yes | No | No | No | Yes |
| Confirm payment | No | No | No | No | View only | Verified webhook |
| Reserve/release stock | No | No | Through API | No | View only | Yes |
| Prepare/mark ready | No | No | Yes | No | View only | No |
| Assign driver/time slot | No | No | Yes | No | View only | Route service |
| Start/stop tracking | No | No | No | Assigned delivery | View only | No |
| Upload proof/signature | No | No | No | Assigned delivery | View only | No |
| Complete delivery | No | No | No | Proof-gated | View only | Yes |
| Adjust stock/count | No | No | Yes, audited | No | View only | No |
| View operational reports | Own history | Assigned | Warehouse scope | Own routes | Yes | Yes |
| Manage staff/roles | No | No | No | No | CEO-approved admin only | No |

All denials must be enforced by the server, not merely hidden in the interface.
