# Food & Grocery Quick-Commerce Platform — Round 3

Runnable Node.js REST API demo for the HLD assignment. Requires Node.js 18+ and no third-party packages.

## Run
```bash
npm start
```
Then open `http://localhost:3000/health`.

## API examples
Search: `GET http://localhost:3000/api/v1/products?q=milk`

Inventory: `GET http://localhost:3000/api/v1/inventory/nearby?productId=P101`

Add to cart:
```bash
curl -X POST http://localhost:3000/api/v1/carts/C101/items -H "Content-Type: application/json" -d '{"productId":"P101","quantity":2}'
```

Place order:
```bash
curl -X POST http://localhost:3000/api/v1/orders -H "Content-Type: application/json" -d '{"cartId":"C101","customerId":"U101","storeId":"STORE-CBE-01"}'
```
Use the returned order ID below:
```bash
curl -X POST http://localhost:3000/api/v1/orders/ORDER_ID/delivery-assignment
curl http://localhost:3000/api/v1/orders/ORDER_ID/delivery-status
curl http://localhost:3000/api/v1/events
```

## API table
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/v1/products?q=milk` | Product search |
| GET | `/api/v1/inventory/nearby?productId=P101` | Nearby stock |
| POST | `/api/v1/carts/:cartId/items` | Add cart item |
| POST | `/api/v1/orders` | Validate stock and place order |
| POST | `/api/v1/orders/:orderId/delivery-assignment` | Assign partner |
| GET | `/api/v1/orders/:orderId/delivery-status` | Track delivery |
| GET | `/api/v1/events` | Demo event log |

## Important limitation
This is a local educational prototype. Data is stored in memory and resets after restart. Its in-process cache/event log demonstrate Redis and Kafka/RabbitMQ concepts but are not real integrations. See `docs/architecture.md` and `schema.sql` for the production design.
