const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const configuredPath = process.env.DATABASE_FILE || "./data/quick-commerce.db";
const dbPath = path.resolve(configuredPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL CHECK(price >= 0),
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS inventory (
  store_id TEXT NOT NULL REFERENCES stores(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id, product_id)
);
CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS cart_items (
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  PRIMARY KEY (cart_id, product_id)
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  store_id TEXT NOT NULL REFERENCES stores(id),
  status TEXT NOT NULL,
  total REAL NOT NULL,
  delivery_address TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  partner_id TEXT,
  partner_name TEXT,
  status TEXT NOT NULL,
  eta TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
`);

function seed() {
  const insertUser = db.prepare("INSERT OR IGNORE INTO users (id,name,email) VALUES (?,?,?)");
  insertUser.run("U101", "Demo Customer", "customer@example.com");

  const insertStore = db.prepare("INSERT OR IGNORE INTO stores (id,name,latitude,longitude) VALUES (?,?,?,?)");
  insertStore.run("S101", "Central Dark Store", 11.0168, 76.9558);
  insertStore.run("S102", "North Dark Store", 11.0300, 76.9600);
  insertStore.run("S103", "South Dark Store", 10.9950, 76.9500);

  const insertProduct = db.prepare("INSERT OR IGNORE INTO products (id,name,category,description,price) VALUES (?,?,?,?,?)");
  [
    ["P101", "Milk 500ml", "Dairy", "Fresh toned milk", 30],
    ["P102", "Rice 1kg", "Staples", "Everyday rice", 68],
    ["P103", "Bread", "Bakery", "Fresh sliced bread", 40],
    ["P104", "Eggs 6-pack", "Dairy", "Pack of six eggs", 48],
    ["P105", "Banana 1 dozen", "Fruits", "Fresh bananas", 55]
  ].forEach(p => insertProduct.run(...p));

  const insertInventory = db.prepare("INSERT OR IGNORE INTO inventory (store_id,product_id,quantity) VALUES (?,?,?)");
  [
    ["S101","P101",25],["S101","P102",15],["S101","P103",8],["S101","P104",12],["S101","P105",10],
    ["S102","P101",10],["S102","P102",20],["S102","P103",0],["S102","P104",6],["S102","P105",18],
    ["S103","P101",0],["S103","P102",8],["S103","P103",14],["S103","P104",9],["S103","P105",5]
  ].forEach(i => insertInventory.run(...i));

  db.prepare("INSERT OR IGNORE INTO carts (id,user_id,status) VALUES ('C101','U101','ACTIVE')").run();
}
seed();

module.exports = db;
