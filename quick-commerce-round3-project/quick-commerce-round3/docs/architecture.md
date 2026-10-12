# High-Level Design

```text
Mobile / Web Client
        | HTTPS REST/JSON
 API Gateway + Load Balancer
        |
  +-----+---------+----------+--------+---------+
  | User Service  | Product  |Inventory| Cart  |
  |               | Service  | Service |Service|
  +---------------+----------+---------+-------+
                         Order Service
                               |
                         Delivery Service
                               |
             +-----------------+----------------+
             |                 |                |
         PostgreSQL          Redis          Kafka/RabbitMQ
      users/products/    hot product &     order, stock,
      inventory/orders   inventory cache   delivery events
```

## Service responsibilities
- User: profiles and authentication.
- Product: catalogue and search.
- Inventory: per-store stock and reservations.
- Cart: items and totals.
- Order: checkout and order lifecycle.
- Delivery: partner assignment and tracking.
- Notification worker: order and delivery notifications.

## Technology choices
- **PostgreSQL:** users, products, inventory, orders; transactions and indexes.
- **Redis:** cart data and frequently requested product/search data; short TTL and invalidation for stock.
- **Kafka/RabbitMQ:** durable asynchronous events such as `OrderPlaced`, `StockReserved`, and `DeliveryAssigned`.

## Consistency and scaling
1. Recheck stock at checkout; cached stock is not authoritative.
2. Use a database transaction or conditional stock update to prevent overselling.
3. Use idempotency keys for checkout retries and a transactional outbox for reliable events.
4. Scale stateless API instances horizontally behind a load balancer.
5. Cache hot product reads, index common queries, and scale queue workers separately.
6. Add timeouts, retry/backoff, rate limits, metrics, logs and alerts.

## Demo vs production
The demo uses in-memory Maps, a small TTL cache, and an in-process event log. Production should replace them with PostgreSQL, Redis, and Kafka/RabbitMQ, plus authentication, payment integration, observability and deployment controls.
