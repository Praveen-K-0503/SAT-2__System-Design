const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const db = require("./db");
const { id, haversineKm } = require("./utils");

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(morgan("dev"));

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
function getCart(cartId) {
  const cart = db.prepare("SELECT * FROM carts WHERE id = ?").get(cartId);
  if (!cart) throw httpError(404, "Cart not found");
  if (cart.status !== "ACTIVE") throw httpError(409, "Cart is not active");
  return cart;
}
function getProduct(productId) {
  const p = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1").get(productId);
  if (!p) throw httpError(404, "Product not found");
  return p;
}
function cartDetails(cartId) {
  const items = db.prepare(`
    SELECT ci.product_id AS productId, p.name, ci.quantity, p.price AS unitPrice,
           ROUND(ci.quantity * p.price, 2) AS subtotal
    FROM cart_items ci JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = ? ORDER BY p.name
  `).all(cartId);
  return {
    cartId,
    items,
    total: Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2))
  };
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Search Product
app.get("/api/v1/products/search", (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) throw httpError(400, "Query parameter 'q' is required");
    const products = db.prepare(`
      SELECT id AS productId, name, category, description, price
      FROM products WHERE active = 1 AND (name LIKE ? OR category LIKE ?)
      ORDER BY name LIMIT 50
    `).all(`%${q}%`, `%${q}%`);
    res.json({ count: products.length, products });
  } catch (e) { next(e); }
});

// Check nearby inventory, sorted by geographic distance
app.get("/api/v1/inventory/nearby", (req, res, next) => {
  try {
    const { productId } = req.query;
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!productId || !Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw httpError(400, "productId, valid lat, and valid lng are required");
    }
    getProduct(String(productId));
    const stores = db.prepare(`
      SELECT s.id AS storeId, s.name AS storeName, s.latitude, s.longitude,
             i.quantity AS availableQuantity
      FROM stores s JOIN inventory i ON i.store_id = s.id
      WHERE s.active = 1 AND i.product_id = ?
    `).all(String(productId)).map(s => ({
      ...s,
      distanceKm: Number(haversineKm(lat, lng, s.latitude, s.longitude).toFixed(2)),
      inStock: s.availableQuantity > 0
    })).sort((a, b) => a.distanceKm - b.distanceKm);
    res.json({ productId, stores });
  } catch (e) { next(e); }
});

// Add product to cart
app.post("/api/v1/carts/:cartId/items", (req, res, next) => {
  try {
    const cart = getCart(req.params.cartId);
    const { productId, quantity } = req.body || {};
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw httpError(400, "productId and integer quantity from 1 to 99 are required");
    }
    const product = getProduct(String(productId));
    const add = db.transaction(() => {
      const existing = db.prepare("SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ?")
        .get(cart.id, product.id);
      const newQuantity = (existing?.quantity || 0) + quantity;
      if (newQuantity > 99) throw httpError(422, "Maximum quantity per product is 99");
      db.prepare(`
        INSERT INTO cart_items (cart_id,product_id,quantity) VALUES (?,?,?)
        ON CONFLICT(cart_id,product_id) DO UPDATE SET quantity=excluded.quantity
      `).run(cart.id, product.id, newQuantity);
    });
    add();
    res.status(201).json({ message: "Product added successfully", ...cartDetails(cart.id) });
  } catch (e) { next(e); }
});

app.get("/api/v1/carts/:cartId", (req, res, next) => {
  try { getCart(req.params.cartId); res.json(cartDetails(req.params.cartId)); }
  catch (e) { next(e); }
});

app.delete("/api/v1/carts/:cartId/items/:productId", (req, res, next) => {
  try {
    getCart(req.params.cartId);
    const result = db.prepare("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?")
      .run(req.params.cartId, req.params.productId);
    if (!result.changes) throw httpError(404, "Cart item not found");
    res.json({ message: "Cart item removed", ...cartDetails(req.params.cartId) });
  } catch (e) { next(e); }
});

// Place order; reserves inventory transactionally and supports idempotency keys.
app.post("/api/v1/orders", (req, res, next) => {
  try {
    const { cartId, userId = "U101", deliveryAddress } = req.body || {};
    if (!cartId || !deliveryAddress || !String(deliveryAddress).trim()) {
      throw httpError(400, "cartId and deliveryAddress are required");
    }
    const idempotencyKey = req.get("Idempotency-Key") || null;
    if (idempotencyKey) {
      const prior = db.prepare("SELECT id FROM orders WHERE idempotency_key = ?").get(idempotencyKey);
      if (prior) return res.status(200).json({ message: "Existing order returned", order: getOrder(prior.id) });
    }
    const orderId = id("O");
    const deliveryId = id("D");
    const createOrder = db.transaction(() => {
      const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
      if (!user) throw httpError(404, "User not found");
      const cart = getCart(cartId);
      if (cart.user_id !== userId) throw httpError(403, "Cart does not belong to this user");
      const items = db.prepare(`
        SELECT ci.product_id AS productId, ci.quantity, p.name, p.price
        FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.cart_id=?
      `).all(cartId);
      if (!items.length) throw httpError(409, "Cannot place an order with an empty cart");

      // Demo rule: choose the closest store to the seeded service area with all requested stock.
      const stores = db.prepare("SELECT * FROM stores WHERE active=1").all();
      const suitable = stores.find(store => items.every(item => {
        const inv = db.prepare("SELECT quantity FROM inventory WHERE store_id=? AND product_id=?")
          .get(store.id, item.productId);
        return inv && inv.quantity >= item.quantity;
      }));
      if (!suitable) throw httpError(409, "Insufficient inventory to fulfil this cart at one store");

      const total = Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
      for (const item of items) {
        const update = db.prepare(`
          UPDATE inventory SET quantity=quantity-?, updated_at=CURRENT_TIMESTAMP
          WHERE store_id=? AND product_id=? AND quantity>=?
        `).run(item.quantity, suitable.id, item.productId, item.quantity);
        if (!update.changes) throw httpError(409, "Inventory changed; please retry the order");
      }
      db.prepare(`INSERT INTO orders
        (id,user_id,store_id,status,total,delivery_address,idempotency_key)
        VALUES (?,?,?,'CONFIRMED',?,?,?)`)
        .run(orderId, userId, suitable.id, total, String(deliveryAddress).trim(), idempotencyKey);
      const insertItem = db.prepare("INSERT INTO order_items (order_id,product_id,product_name,quantity,unit_price) VALUES (?,?,?,?,?)");
      items.forEach(item => insertItem.run(orderId, item.productId, item.name, item.quantity, item.price));
      db.prepare("INSERT INTO deliveries (id,order_id,status) VALUES (?,?,'PENDING_ASSIGNMENT')")
        .run(deliveryId, orderId);
      db.prepare("UPDATE carts SET status='CHECKED_OUT' WHERE id=?").run(cartId);
    });
    createOrder();
    res.status(201).json({ message: "Order placed successfully", order: getOrder(orderId) });
  } catch (e) { next(e); }
});

function getOrder(orderId) {
  const order = db.prepare(`
    SELECT o.id AS orderId, o.user_id AS userId, o.store_id AS storeId, o.status,
           o.total, o.delivery_address AS deliveryAddress, o.created_at AS createdAt,
           d.id AS deliveryId, d.partner_id AS deliveryPartnerId, d.partner_name AS deliveryPartnerName,
           d.status AS deliveryStatus, d.eta AS estimatedDeliveryTime
    FROM orders o LEFT JOIN deliveries d ON d.order_id=o.id WHERE o.id=?
  `).get(orderId);
  if (!order) throw httpError(404, "Order not found");
  order.items = db.prepare("SELECT product_id AS productId, product_name AS name, quantity, unit_price AS unitPrice FROM order_items WHERE order_id=?")
    .all(orderId);
  return order;
}

// Assign delivery partner
app.post("/api/v1/orders/:orderId/delivery-assignment", (req, res, next) => {
  try {
    const order = db.prepare("SELECT id,status FROM orders WHERE id=?").get(req.params.orderId);
    if (!order) throw httpError(404, "Order not found");
    if (order.status === "CANCELLED") throw httpError(409, "Cannot assign delivery to a cancelled order");
    const { partnerId, partnerName, eta } = req.body || {};
    if (!partnerId || !partnerName) throw httpError(400, "partnerId and partnerName are required");
    db.prepare(`UPDATE deliveries SET partner_id=?, partner_name=?, status='ASSIGNED', eta=?, updated_at=CURRENT_TIMESTAMP WHERE order_id=?`)
      .run(String(partnerId), String(partnerName), eta || null, order.id);
    db.prepare("UPDATE orders SET status='READY_FOR_DELIVERY' WHERE id=?").run(order.id);
    res.json({ message: "Delivery partner assigned", order: getOrder(order.id) });
  } catch (e) { next(e); }
});

// Get delivery status
app.get("/api/v1/orders/:orderId/delivery-status", (req, res, next) => {
  try {
    const order = getOrder(req.params.orderId);
    res.json({
      orderId: order.orderId,
      orderStatus: order.status,
      deliveryPartnerId: order.deliveryPartnerId,
      deliveryPartnerName: order.deliveryPartnerName,
      deliveryStatus: order.deliveryStatus,
      estimatedDeliveryTime: order.estimatedDeliveryTime
    });
  } catch (e) { next(e); }
});

// Update delivery status (demo/admin endpoint)
app.patch("/api/v1/orders/:orderId/delivery-status", (req, res, next) => {
  try {
    const order = db.prepare("SELECT id,status FROM orders WHERE id=?").get(req.params.orderId);
    if (!order) throw httpError(404, "Order not found");
    const allowed = ["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"];
    const { status } = req.body || {};
    if (!allowed.includes(status)) throw httpError(400, `status must be one of: ${allowed.join(", ")}`);
    const current = db.prepare("SELECT status,partner_id FROM deliveries WHERE order_id=?").get(order.id);
    if (!current.partner_id) throw httpError(409, "Assign a delivery partner first");
    const transitions = {
      ASSIGNED: ["PICKED_UP", "FAILED"],
      PICKED_UP: ["OUT_FOR_DELIVERY", "FAILED"],
      OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
      DELIVERED: [],
      FAILED: []
    };
    if (!(transitions[current.status] || []).includes(status)) {
      throw httpError(409, `Invalid delivery status transition: ${current.status} -> ${status}`);
    }
    db.prepare("UPDATE deliveries SET status=?, updated_at=CURRENT_TIMESTAMP WHERE order_id=?").run(status, order.id);
    if (status === "DELIVERED") db.prepare("UPDATE orders SET status='DELIVERED' WHERE id=?").run(order.id);
    if (status === "FAILED") db.prepare("UPDATE orders SET status='DELIVERY_FAILED' WHERE id=?").run(order.id);
    res.json({ message: "Delivery status updated", order: getOrder(order.id) });
  } catch (e) { next(e); }
});

app.get("/api/v1/orders/:orderId", (req, res, next) => {
  try { res.json(getOrder(req.params.orderId)); } catch (e) { next(e); }
});

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, _req, res, _next) => {
  const status = Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "Internal server error" });
});

module.exports = app;
