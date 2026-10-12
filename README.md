# Food & Grocery Quick-Commerce Platform

A system-design and implementation project for a food and grocery quick-commerce platform. The repository contains the work completed across **Round 2 (Low-Level Design)** and **Round 3 (High-Level Design)**.

The platform models the complete customer journey:

1. Search for products.
2. Find nearby inventory.
3. Add products to a cart.
4. Reserve stock and place an order.
5. Assign a delivery partner.
6. Track and update delivery status.

## Repository structure

```text
SAT-2__System-Design/
├── quick-commerce-platform/
│   └── quick-commerce-platform/        # Round 2 implementation
│       ├── src/                         # REST API and persistence logic
│       ├── test/                        # Node.js tests
│       ├── docs/architecture.md         # Architecture documentation
│       ├── package.json
│       └── README.md
│
└── quick-commerce-round3-project/
    └── quick-commerce-round3/           # Round 3 HLD demonstration
        ├── src/                         # Lightweight REST API demo
        ├── test/                        # Tests
        ├── docs/                        # Design documentation
        ├── schema.sql                   # Relational data model
        ├── package.json
        └── README.md
```

## Round 2 — Low-Level Design implementation

Location: `quick-commerce-platform/quick-commerce-platform`

The Round 2 project is a runnable Node.js REST API with a self-contained SQLite database.

### Implemented capabilities

- Product search by name or category.
- Nearby-store inventory lookup sorted by distance.
- Add and remove cart items.
- Cart total calculation.
- Transactional stock reservation while placing orders.
- Idempotent order creation using the `Idempotency-Key` header.
- Delivery-partner assignment.
- Delivery-status retrieval and validated status transitions.
- Input validation and consistent JSON error responses.
- Seed data for demo users, carts, products, stores, and inventory.
- Automated tests using the Node.js built-in test runner.

### Round 2 technology stack

- Node.js 20+
- Express.js
- SQLite with `better-sqlite3`
- Helmet, CORS, Morgan, and dotenv
- Node.js built-in test runner

### Run Round 2

```bash
cd quick-commerce-platform/quick-commerce-platform
npm install
cp .env.example .env
npm start
```

For Windows PowerShell:

```powershell
cd quick-commerce-platform/quick-commerce-platform
npm install
Copy-Item .env.example .env
npm start
```

The API runs at `http://localhost:3000`.

Run tests with:

```bash
npm test
```

## Round 3 — High-Level System Design demonstration

Location: `quick-commerce-round3-project/quick-commerce-round3`

The Round 3 project presents a smaller, dependency-free Node.js REST API that demonstrates the main service flows and HLD concepts. It uses in-memory data, so all data is reset when the process restarts.

### Demonstrated capabilities

- Product search.
- Nearby inventory lookup.
- Add products to a cart.
- Stock validation and order placement.
- Delivery assignment.
- Delivery-status tracking.
- Event-log output representing asynchronous platform events.
- Health checking.

### Round 3 technology stack

- Node.js 18+
- Native Node.js HTTP/server functionality
- No third-party runtime packages
- SQL schema documented in `schema.sql`

### Run Round 3

```bash
cd quick-commerce-round3-project/quick-commerce-round3
npm install
npm start
```

The API runs at `http://localhost:3000`.

Health check:

```bash
curl http://localhost:3000/health
```

## API overview

The primary business flows are represented by the following endpoints. Exact endpoint details and request examples are available in each round's README.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/api/v1/products/search?q=milk` | Search products in Round 2 |
| `GET` | `/api/v1/products?q=milk` | Search products in Round 3 |
| `GET` | `/api/v1/inventory/nearby?productId=P101` | Find nearby stock |
| `POST` | `/api/v1/carts/:cartId/items` | Add an item to a cart |
| `GET` | `/api/v1/carts/:cartId` | View a cart in Round 2 |
| `POST` | `/api/v1/orders` | Validate stock and place an order |
| `POST` | `/api/v1/orders/:orderId/delivery-assignment` | Assign a delivery partner |
| `GET` | `/api/v1/orders/:orderId/delivery-status` | Read delivery status |
| `PATCH` | `/api/v1/orders/:orderId/delivery-status` | Update delivery status in Round 2 |
| `GET` | `/api/v1/events` | Read the demo event log in Round 3 |

## Order and delivery lifecycle

A successful order follows this general flow:

```text
Product search
    ↓
Nearby inventory check
    ↓
Add items to cart
    ↓
Validate and reserve stock
    ↓
Create order
    ↓
Assign delivery partner
    ↓
ASSIGNED → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED
```

`FAILED` can be used from an active delivery stage. Round 2 also validates invalid state transitions and supports idempotent order creation.

## Data model

Round 3 includes `schema.sql`, which defines the core relational entities:

- `users`
- `products`
- `inventory`
- `orders`
- `order_items`

The schema includes primary keys, foreign keys, validation constraints, and indexes for product search and customer order history. The inventory reservation example uses an atomic conditional update so stock cannot become negative during concurrent reservations.

Round 2 uses SQLite persistence and initializes the local database and demo data automatically on first start.

## Demo data

The projects use demo product identifiers such as:

| Product ID | Product | Price (INR) |
|---|---|---:|
| `P101` | Milk 500ml | 30 |
| `P102` | Rice 1kg | 68 |
| `P103` | Bread | 40 |
| `P104` | Eggs 6-pack | 48 |
| `P105` | Banana 1 dozen | 55 |

Round 2 also seeds demo user `U101` and cart `C101`.

## Suggested evaluation flow

1. Start the Round 2 implementation and run its tests.
2. Search for a product.
3. Check nearby inventory.
4. Add a product to the demo cart.
5. Place an order with an idempotency key.
6. Assign a delivery partner.
7. Move the delivery through its valid status sequence.
8. Review `docs/architecture.md` and the Round 3 documentation for the high-level design.
9. Run the Round 3 demo to inspect the simplified HLD-oriented API and event flow.
10. Review `schema.sql` for the proposed persistent data model.

## Limitations and production considerations

These projects are educational system-design prototypes rather than production deployments. They do not currently provide real authentication, payment processing, live GPS tracking, external delivery-partner integration, or a production message broker.

For production, the platform would need authenticated users, a durable database service, distributed inventory reservation, payment and refund workflows, observability, rate limiting, deployment automation, and real asynchronous messaging such as Kafka or RabbitMQ. The Round 2 implementation provides the stronger local persistence and API behavior, while Round 3 communicates the simplified service and data-flow concepts.

## Detailed documentation

- [Round 2 README](quick-commerce-platform/quick-commerce-platform/README.md)
- [Round 2 architecture](quick-commerce-platform/quick-commerce-platform/docs/architecture.md)
- [Round 3 README](quick-commerce-round3-project/quick-commerce-round3/README.md)
- [Round 3 schema](quick-commerce-round3-project/quick-commerce-round3/schema.sql)

## License

See the Round 2 project `LICENSE` file for licensing information.
