# High-Level System Design

## Logical architecture

```text
Mobile / Web Client
        |
   Load Balancer
        |
     API Gateway
        |
  +-----+--------+-----------+----------+----------+
  |              |           |          |          |
User Service  Product     Inventory    Cart      Order
               Service     Service    Service    Service
                                                   |
                                             Delivery Service
        |              |           |          |          |
        +--------------+-----------+----------+----------+
                               |
                    Databases / Cache / Broker
```

## Suggested production components

- **Users:** PostgreSQL; profile, address, and authentication data.
- **Products:** PostgreSQL for catalog records; Elasticsearch/OpenSearch for text search.
- **Inventory:** PostgreSQL transactions for authoritative stock; optional Redis cache for read-heavy availability.
- **Carts:** Redis for low-latency temporary carts; durable storage where cart recovery is required.
- **Orders:** PostgreSQL for ACID transaction guarantees.
- **Delivery:** PostgreSQL for delivery assignments and status history.
- **Cache:** Redis, using cache-aside for product data and short TTLs/event invalidation for inventory.
- **Messaging:** Kafka or RabbitMQ for `OrderPlaced`, `InventoryUpdated`, `DeliveryAssigned`, and notification events.

## Order consistency

The demo implementation reserves stock and creates the order in a single SQLite transaction. A production multi-service implementation should use an outbox pattern and a saga/process manager for cross-service workflows, idempotent consumers, retries, dead-letter queues, and compensating actions if fulfilment fails.

## Scalability

1. Horizontally scale stateless API instances behind a load balancer.
2. Cache popular product and search responses.
3. Use database indexes, connection pooling, read replicas, and partitioning where justified.
4. Use a message broker to process notifications and delivery workflows asynchronously.
5. Reserve inventory atomically; never trust cached stock for final order confirmation.
6. Apply rate limits, timeouts, circuit breakers, health checks, and autoscaling.
7. Monitor latency, error rate, stock conflicts, queue lag, and order throughput.

## Scope note

This repository is a runnable educational monolith implementing the Round 2 APIs and demonstrating Round 3 concepts. The production microservice architecture above is a design proposal, not a claim that every production infrastructure component is already deployed in this demo.
