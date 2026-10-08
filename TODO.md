

## Production platform phase 1 — authentication and authorization foundation

- [x] Preserve Manus OAuth as the authentication provider and keep the existing secure application session cookie contract.
- [x] Expand the user role model additively to support legacy user records plus customer, admin, owner, and staff roles.
- [x] Add server-side permission mapping for admin access, products, inventory, orders, printing, customers, analytics, loyalty, and staff management.
- [x] Bind the configured owner identity to the owner role without trusting frontend role checks.
- [x] Protect catalog inventory reads and writes with server-side permission middleware.
- [x] Add authenticated, loading, and forbidden states to the `/admin` route.
- [x] Add permission matrix tests and rerun the existing OAuth/session tests.

## Production platform phase 2 — commerce, cart persistence & orders foundation

- [x] Persistent active cart for authenticated customers with server-enforced quantity validation.
- [x] Server-side price calculation and product validation (reject out-of-stock and unpublished items).
- [x] Guest cart localStorage syncing and automatic server merge upon user sign-in.
- [x] Order creation with fulfillment options (Store Pickup, Self Pickup, Delivery) and delivery address validation.
- [x] Stock reservation and inventory concurrency handling during order checkout.
- [x] Customer IDOR prevention on order access (`/orders/:id` and `orders.get`).
- [x] Admin order management pipeline (`adminList`, `adminGet`, status updates with order history logging).
- [x] End-to-end commerce unit and integration test coverage (all 22 unit & integration tests passing).

