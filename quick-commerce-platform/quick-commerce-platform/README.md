# Food & Grocery Quick-Commerce Platform

A GitHub-ready REST API project for a lab exam covering Low-Level Design (Round 2) and High-Level System Design (Round 3).

## Features

- Product search by name or category
- Nearby store inventory sorted by distance
- Add and remove cart items
- View cart totals
- Place an order with transactional stock reservation
- Idempotency support for order creation using `Idempotency-Key`
- Assign a delivery partner
- Read and update delivery status with transition validation
- SQLite persistence, seed data, input validation, and consistent JSON errors
- High-level architecture and scalability design in `docs/architecture.md`

## Tech stack

- Node.js 20+
- Express.js REST API
- SQLite (`better-sqlite3`) for a self-contained local demo
- Helmet, CORS, Morgan, dotenv
- Node.js built-in test runner

## Setup

```bash
git clone <your-repository-url>
cd quick-commerce-platform
npm install
cp .env.example .env
npm start
```

Windows PowerShell alternative for environment file:

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Server: `http://localhost:3000`

The database and demo data are initialized automatically on first start. A demo user `U101` and active cart `C101` are seeded.

## API reference

### 1. Search products

```http
GET /api/v1/products/search?q=milk
```

Example:
```bash
curl "http://localhost:3000/api/v1/products/search?q=milk"
```

### 2. Check nearby inventory

```http
GET /api/v1/inventory/nearby?productId=P101&lat=11.0168&lng=76.9558
```

```bash
curl "http://localhost:3000/api/v1/inventory/nearby?productId=P101&lat=11.0168&lng=76.9558"
```

### 3. Add product to cart

```http
POST /api/v1/carts/C101/items
Content-Type: application/json
```

```json
{
  "productId": "P101",
  "quantity": 2
}
```

```bash
curl -X POST "http://localhost:3000/api/v1/carts/C101/items" \
  -H "Content-Type: application/json" \
  -d '{"productId":"P101","quantity":2}'
```

### 4. View cart

```http
GET /api/v1/carts/C101
```

### 5. Place order

```http
POST /api/v1/orders
Content-Type: application/json
Idempotency-Key: demo-order-001
```

```json
{
  "cartId": "C101",
  "userId": "U101",
  "deliveryAddress": "Demo address, Coimbatore"
}
```

```bash
curl -X POST "http://localhost:3000/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-order-001" \
  -d '{"cartId":"C101","userId":"U101","deliveryAddress":"Demo address, Coimbatore"}'
```

Copy the returned `orderId` for the next requests. The cart is checked out after a successful order.

### 6. Assign delivery partner

Replace `OXXXXXXXX` with the actual returned order ID.

```http
POST /api/v1/orders/OXXXXXXXX/delivery-assignment
Content-Type: application/json
```

```json
{
  "partnerId": "D201",
  "partnerName": "Demo Delivery Partner",
  "eta": "2026-10-12T12:30:00+05:30"
}
```

### 7. Get delivery status

```http
GET /api/v1/orders/OXXXXXXXX/delivery-status
```

### 8. Update delivery status

```http
PATCH /api/v1/orders/OXXXXXXXX/delivery-status
Content-Type: application/json
```

```json
{
  "status": "PICKED_UP"
}
```

Allowed progression: `ASSIGNED` → `PICKED_UP` → `OUT_FOR_DELIVERY` → `DELIVERED`. `FAILED` is allowed from the active delivery stages.

### 9. Get complete order

```http
GET /api/v1/orders/OXXXXXXXX
```

### 10. Health check

```http
GET /health
```

## Status codes

- `200 OK`: successful read/update or idempotent replay
- `201 Created`: cart item or order created
- `400 Bad Request`: missing or invalid input
- `403 Forbidden`: cart ownership mismatch
- `404 Not Found`: resource/route not found
- `409 Conflict`: empty cart, insufficient stock, or invalid state transition
- `422 Unprocessable Content`: quantity limit exceeded
- `500 Internal Server Error`: unexpected server failure

## Demo product IDs

| Product ID | Product | Price (INR) |
|---|---|---:|
| `P101` | Milk 500ml | 30 |
| `P102` | Rice 1kg | 68 |
| `P103` | Bread | 40 |
| `P104` | Eggs 6-pack | 48 |
| `P105` | Banana 1 dozen | 55 |

Demo stores are seeded near the example coordinates. Inventory changes after successful order placement.

## Run tests

```bash
npm test
```

## Suggested manual testing order

1. Search products.
2. Check nearby inventory.
3. Add a product to cart.
4. View the cart.
5. Place an order.
6. Assign a delivery partner using the returned order ID.
7. Read delivery status.
8. Update status to `PICKED_UP`, then `OUT_FOR_DELIVERY`, then `DELIVERED`.

## Project structure

```text
quick-commerce-platform/
├── src/
│   ├── app.js
│   ├── db.js
│   ├── server.js
│   └── utils.js
├── test/
│   └── utils.test.js
├── docs/
│   └── architecture.md
├── data/                 # Created automatically; database is gitignored
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Limitations and production considerations

This is an educational single-process application, not a deployed production platform. It does not implement real authentication, payment processing, live GPS, or actual message-broker integration. Before production use, add authentication/authorization, payment-provider integration, request tracing, audit logs, rate limiting, a migration strategy, and automated API/integration tests. The Round 3 architecture document explains how to evolve the demo toward independently scalable services, Redis, and Kafka/RabbitMQ.

## License

MIT — see `LICENSE`.
