CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE products (
  product_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_products_name ON products (lower(name));
CREATE INDEX idx_products_category ON products (category);
CREATE TABLE inventory (
  store_id TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(product_id),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, product_id)
);
CREATE TABLE orders (
  order_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(user_id),
  store_id TEXT NOT NULL,
  status TEXT NOT NULL,
  total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_customer_created ON orders (customer_id, created_at DESC);
CREATE TABLE order_items (
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  product_id TEXT NOT NULL REFERENCES products(product_id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  PRIMARY KEY (order_id, product_id)
);
-- Atomic reservation example:
-- UPDATE inventory SET quantity = quantity - $1, updated_at = now()
-- WHERE store_id = $2 AND product_id = $3 AND quantity >= $1;
-- If zero rows are affected, stock is insufficient.
