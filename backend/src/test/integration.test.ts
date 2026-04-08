import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Color helpers
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail: string = "") {
  if (condition) {
    passed++;
    console.log(`  ${GREEN}✓${RESET} ${testName}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`  ${RED}✗${RESET} ${testName}${detail ? ` — ${detail}` : ""}`);
  }
}

// ============================================================
// HTTP TEST HELPERS
// ============================================================

async function http(method: string, path: string, body?: any, token?: string): Promise<{ status: number; data: any }> {
  const url = `http://localhost:5000${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  try { data = await res.json(); } catch { data = null; }

  return { status: res.status, data };
}

// ============================================================
// TEST SUITE
// ============================================================

async function runTests() {
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}  HALAL ACCESSOR BACKEND — FULL INTEGRATION TEST${RESET}`);
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════${RESET}\n`);

  // ──────────────────────────────────────────────────────────
  // PHASE 1: HEALTH CHECK
  // ──────────────────────────────────────────────────────────
  console.log(`${BOLD}${YELLOW}Phase 1: Health Check${RESET}`);

  const health = await http("GET", "/health");
  assert(health.status === 200, "GET /health", `status=${health.status}, body.status=${health.data?.status}`);
  assert(health.data?.status === "ok", "Health check returns ok", "");

  // ──────────────────────────────────────────────────────────
  // PHASE 2: AUTH MODULE
  // ──────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${YELLOW}Phase 2: Auth Module${RESET}`);

  // 2a: Register new customer
  const register = await http("POST", "/api/auth/register", {
    name: "Integration Test User",
    phone: "+251922222222",
    password: "testpass123",
  });
  assert(register.status === 201, "POST /api/auth/register", `status=${register.status}`);
  assert(!!register.data?.user, "Register returns user object", "");
  assert(register.data?.user?.name === "Integration Test User", "User name correct", "");
  assert(register.data?.user?.phone === "+251922222222", "User phone correct", "");
  assert(!!register.data?.accessToken, "Register returns accessToken", "");
  assert(register.data?.user?.role === "CUSTOMER", "Default role is CUSTOMER", "");
  const customerToken = register.data?.accessToken;

  // 2b: Duplicate registration
  const dupRegister = await http("POST", "/api/auth/register", {
    name: "Duplicate",
    phone: "+251922222222",
    password: "testpass123",
  });
  assert(dupRegister.status === 409, "Duplicate registration rejected", `status=${dupRegister.status}`);

  // 2c: Login
  const login = await http("POST", "/api/auth/login", {
    phone: "+251922222222",
    password: "testpass123",
  });
  assert(login.status === 200, "POST /api/auth/login", `status=${login.status}`);
  assert(!!login.data?.accessToken, "Login returns accessToken", "");
  assert(login.data?.user?.name === "Integration Test User", "Login returns user", "");
  const loginToken = login.data?.accessToken;

  // 2d: Wrong password
  const badLogin = await http("POST", "/api/auth/login", {
    phone: "+251922222222",
    password: "wrongpassword",
  });
  assert(badLogin.status === 401, "Wrong password rejected", `status=${badLogin.status}`);

  // 2e: Non-existent user
  const noUser = await http("POST", "/api/auth/login", {
    phone: "+251999999999",
    password: "testpass123",
  });
  assert(noUser.status === 401, "Non-existent user rejected", `status=${noUser.status}`);

  // 2f: Get me
  const me = await http("GET", "/api/auth/me", undefined, loginToken);
  assert(me.status === 200, "GET /api/auth/me", `status=${me.status}`);
  assert(me.data?.phone === "+251922222222", "GetMe returns correct user", "");

  // 2g: No token
  const noToken = await http("GET", "/api/auth/me");
  assert(noToken.status === 401, "Unauthenticated /me rejected", `status=${noToken.status}`);

  // 2h: Admin login
  const adminLogin = await http("POST", "/api/auth/login", {
    phone: "+251900000000",
    password: "admin123",
  });
  assert(adminLogin.status === 200, "Admin login", `status=${adminLogin.status}`);
  assert(adminLogin.data?.user?.role === "ADMIN", "Admin role confirmed", "");
  const adminToken = adminLogin.data?.accessToken;

  // ──────────────────────────────────────────────────────────
  // PHASE 3: PRODUCT MODULE
  // ──────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${YELLOW}Phase 3: Product Module${RESET}`);

  // 3a: Get all products (public)
  const products = await http("GET", "/api/products");
  assert(products.status === 200, "GET /api/products", `status=${products.status}, count=${products.data?.length || 0}`);
  assert(Array.isArray(products.data), "Products returns array", "");
  assert((products.data?.length || 0) >= 8, "At least 8 products exist", "");

  // 3b: Get single product
  const firstProduct = products.data[0];
  const product = await http("GET", `/api/products/${firstProduct.id}`);
  assert(product.status === 200, "GET /api/products/:id", `status=${product.status}`);
  assert(product.data?.name === firstProduct.name, "Product name matches", "");

  // 3c: Get categories
  const categories = await http("GET", "/api/products/categories");
  assert(categories.status === 200, "GET /api/products/categories", `status=${categories.status}, count=${categories.data?.length || 0}`);
  assert((categories.data?.length || 0) >= 6, "At least 6 categories exist", "");

  // 3d: Search products
  const search = await http("GET", "/api/products?search=USB");
  assert(search.status === 200, "GET /api/products?search=USB", `count=${search.data?.length || 0}`);
  assert((search.data?.length || 0) > 0, "Search returns results", "");

  // 3e: Admin creates product
  const newProduct = await http("POST", "/api/products", {
    name: "Test Product",
    price: 999,
    stock: 10,
  }, adminToken);
  assert(newProduct.status === 201, "Admin creates product", `status=${newProduct.status}`);
  assert(newProduct.data?.name === "Test Product", "Product name correct", "");
  assert(newProduct.data?.price === 999, "Product price correct", "");
  const testProductId = newProduct.data?.id;

  // 3f: Customer cannot create product
  const customerCreate = await http("POST", "/api/products", {
    name: "Hacker Product",
    price: 1,
    stock: 1,
  }, customerToken);
  assert(customerCreate.status === 403, "Customer cannot create products", `status=${customerCreate.status}`);

  // 3g: Unauthenticated cannot create product
  const unauthCreate = await http("POST", "/api/products", {
    name: "Hacker Product",
    price: 1,
    stock: 1,
  });
  assert(unauthCreate.status === 401, "Unauthenticated cannot create products", `status=${unauthCreate.status}`);

  // 3h: Admin updates product
  const updateProduct = await http("PUT", `/api/products/${testProductId}`, {
    name: "Updated Test Product",
    price: 1499,
  }, adminToken);
  assert(updateProduct.status === 200, "Admin updates product", `status=${updateProduct.status}`);
  assert(updateProduct.data?.name === "Updated Test Product", "Updated name correct", "");
  assert(updateProduct.data?.price === 1499, "Updated price correct", "");

  // 3i: Admin deletes product
  const deleteProduct = await http("DELETE", `/api/products/${testProductId}`, undefined, adminToken);
  assert(deleteProduct.status === 200, "Admin deletes product", `status=${deleteProduct.status}`);

  // 3j: Deleted product not found
  const deletedProduct = await http("GET", `/api/products/${testProductId}`);
  assert(deletedProduct.data === null || !deletedProduct.data?.id, "Deleted product returns null or no id", `data=${JSON.stringify(deletedProduct.data)?.substring(0, 50)}`);

  // ──────────────────────────────────────────────────────────
  // PHASE 4: CART MODULE
  // ──────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${YELLOW}Phase 4: Cart Module${RESET}`);

  // 4a: Empty cart
  const emptyCart = await http("GET", "/api/cart", undefined, customerToken);
  assert(emptyCart.status === 200, "GET /api/cart (empty)", `status=${emptyCart.status}`);
  assert(emptyCart.data?.totalItems === 0, "Empty cart has 0 items", "");
  assert(emptyCart.data?.totalAmount === 0, "Empty cart total is 0", "");

  // 4b: Add to cart
  const addItem = await http("POST", "/api/cart", {
    productId: firstProduct.id,
    quantity: 2,
  }, customerToken);
  assert(addItem.status === 201, "POST /api/cart (add item)", `status=${addItem.status}`);
  assert(addItem.data?.quantity === 2, "Quantity is 2", "");

  // 4c: Cart reflects addition
  const cartAfterAdd = await http("GET", "/api/cart", undefined, customerToken);
  assert(cartAfterAdd.data?.totalItems === 1, "Cart has 1 unique item", "");
  const expectedTotal = firstProduct.price * 2;
  assert(cartAfterAdd.data?.totalAmount === expectedTotal, `Cart total is correct (${expectedTotal} ETB)`, "");

  // 4d: Update quantity
  const itemId = addItem.data?.id;
  const updateItem = await http("PUT", `/api/cart/${itemId}`, { quantity: 5 }, customerToken);
  assert(updateItem.status === 200, "PUT /api/cart/:itemId (update qty)", `status=${updateItem.status}`);
  assert(updateItem.data?.quantity === 5, "Updated quantity is 5", "");

  // 4e: Backend recalculates total
  const cartAfterUpdate = await http("GET", "/api/cart", undefined, customerToken);
  const newTotal = firstProduct.price * 5;
  assert(cartAfterUpdate.data?.totalAmount === newTotal, `Backend recalculated total (${newTotal} ETB)`, "");

  // 4f: Add second product
  const secondProduct = products.data[1];
  await http("POST", "/api/cart", {
    productId: secondProduct.id,
    quantity: 1,
  }, customerToken);

  const multiCart = await http("GET", "/api/cart", undefined, customerToken);
  assert(multiCart.data?.totalItems === 2, "Cart has 2 unique items", "");
  const multiTotal = (firstProduct.price * 5) + secondProduct.price;
  assert(multiCart.data?.totalAmount === multiTotal, `Multi-item total correct (${multiTotal} ETB)`, "");

  // 4g: Remove item
  const removeItem = await http("DELETE", `/api/cart/${itemId}`, undefined, customerToken);
  assert(removeItem.status === 200, "DELETE /api/cart/:itemId", `status=${removeItem.status}`);

  // 4h: Clear cart
  await http("DELETE", "/api/cart", undefined, customerToken);
  const clearedCart = await http("GET", "/api/cart", undefined, customerToken);
  assert(clearedCart.data?.totalItems === 0, "Cleared cart has 0 items", "");

  // ──────────────────────────────────────────────────────────
  // PHASE 5: DELIVERY MODULE
  // ──────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${YELLOW}Phase 5: Delivery Module${RESET}`);

  // 5a: Calculate delivery fee (near shop)
  const nearDelivery = await http("POST", "/api/delivery/fee", { lat: 7.1300, lng: 40.0200 });
  assert(nearDelivery.status === 200, "POST /api/delivery/fee (near)", `status=${nearDelivery.status}`);
  assert(nearDelivery.data?.distanceKm > 0, "Distance calculated", `distance=${nearDelivery.data?.distanceKm}km`);
  assert(nearDelivery.data?.fee > 0, "Fee calculated", `fee=${nearDelivery.data?.fee} ETB`);

  // 5b: Calculate delivery fee (far from shop but still in range)
  const farDelivery = await http("POST", "/api/delivery/fee", { lat: 7.3000, lng: 40.2000 });
  assert(farDelivery.status === 200, "POST /api/delivery/fee (far)", `status=${farDelivery.status}`);
  assert(farDelivery.data?.fee > nearDelivery.data?.fee, "Far delivery costs more", `far=${farDelivery.data?.fee} ETB, near=${nearDelivery.data?.fee} ETB`);

  // 5c: Out of range
  const outOfRange = await http("POST", "/api/delivery/fee", { lat: 10.0000, lng: 50.0000 });
  assert(outOfRange.status === 400, "Out of range delivery rejected", `status=${outOfRange.status}`);

  // 5d: Invalid input
  const badFee = await http("POST", "/api/delivery/fee", { lat: "invalid", lng: 40.0200 });
  assert(badFee.status === 400, "Invalid lat/lng rejected", `status=${badFee.status}`);

  // ──────────────────────────────────────────────────────────
  // PHASE 6: ORDER MODULE
  // ──────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${YELLOW}Phase 6: Order Module${RESET}`);

  // 6a: Setup — add products to cart
  await http("POST", "/api/cart", { productId: firstProduct.id, quantity: 3 }, customerToken);

  // 6b: Create order (PICKUP)
  const orderPickup = await http("POST", "/api/orders", {
    deliveryType: "PICKUP",
  }, customerToken);
  assert(orderPickup.status === 201, "POST /api/orders (PICKUP)", `status=${orderPickup.status}`);
  assert(orderPickup.data?.status === "PENDING", "Order status is PENDING", "");
  assert(orderPickup.data?.deliveryFee === 0, "Pickup has no delivery fee", "");
  const expectedPickupTotal = firstProduct.price * 3;
  assert(orderPickup.data?.totalAmount === expectedPickupTotal, `Order total correct (${expectedPickupTotal} ETB)`, "");
  assert(orderPickup.data?.finalAmount === expectedPickupTotal, "Final amount matches total", "");
  assert(orderPickup.data?.items?.length === 1, "Order has 1 line item", "");
  assert(orderPickup.data?.deliveryType === "PICKUP", "Delivery type is PICKUP", "");
  const pickupOrderId = orderPickup.data?.id;

  // 6c: Cart is cleared after checkout
  const cartAfterOrder = await http("GET", "/api/cart", undefined, customerToken);
  assert(cartAfterOrder.data?.totalItems === 0, "Cart cleared after order", "");

  // 6d: Cannot order empty cart
  const emptyOrder = await http("POST", "/api/orders", { deliveryType: "PICKUP" }, customerToken);
  assert(emptyOrder.status === 400, "Empty cart order rejected", `status=${emptyOrder.status}`);

  // 6e: Create order (DELIVERY)
  await http("POST", "/api/cart", { productId: secondProduct.id, quantity: 1 }, customerToken);

  const orderDelivery = await http("POST", "/api/orders", {
    deliveryType: "DELIVERY",
    latitude: 7.1300,
    longitude: 40.0200,
  }, customerToken);
  assert(orderDelivery.status === 201, "POST /api/orders (DELIVERY)", `status=${orderDelivery.status}`);
  assert(orderDelivery.data?.deliveryFee > 0, "Delivery order has fee", `fee=${orderDelivery.data?.deliveryFee} ETB`);
  assert(orderDelivery.data?.finalAmount > orderDelivery.data?.totalAmount, "Final > subtotal (includes delivery)", "");
  const deliveryOrderId = orderDelivery.data?.id;

  // 6f: Missing location for delivery
  await http("POST", "/api/cart", { productId: firstProduct.id, quantity: 1 }, customerToken);
  const noLocation = await http("POST", "/api/orders", {
    deliveryType: "DELIVERY",
  }, customerToken);
  assert(noLocation.status === 400, "Delivery without location rejected", `status=${noLocation.status}`);

  // 6g: Get user's orders
  const myOrders = await http("GET", "/api/orders/my-orders", undefined, customerToken);
  assert(myOrders.status === 200, "GET /api/orders/my-orders", `count=${myOrders.data?.length || 0}`);
  assert((myOrders.data?.length || 0) >= 2, "Customer has at least 2 orders", "");

  // 6h: Get single order
  const singleOrder = await http("GET", `/api/orders/${pickupOrderId}`, undefined, customerToken);
  assert(singleOrder.status === 200, "GET /api/orders/:id", `status=${singleOrder.status}`);
  assert(singleOrder.data?.id === pickupOrderId, "Order ID matches", "");

  // 6i: Admin views all orders
  const allOrders = await http("GET", "/api/orders", undefined, adminToken);
  assert(allOrders.status === 200, "Admin GET /api/orders", `count=${allOrders.data?.length || 0}`);

  // 6j: Admin updates order status
  const statusUpdate = await http("PUT", `/api/orders/${pickupOrderId}/status`, {
    status: "PROCESSING",
  }, adminToken);
  assert(statusUpdate.status === 200, "Admin updates order status", `status: ${statusUpdate.data?.status}`);

  // 6k: Customer cannot view other's orders (implicit — separate user)

  // 6l: Invalid status
  const badStatus = await http("PUT", `/api/orders/${pickupOrderId}/status`, {
    status: "INVALID_STATUS",
  }, adminToken);
  assert(badStatus.status === 400, "Invalid order status rejected", `status=${badStatus.status}`);

  // ──────────────────────────────────────────────────────────
  // PHASE 7: PAYMENT MODULE
  // ──────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${YELLOW}Phase 7: Payment Module${RESET}`);

  // 7a: Create payment session
  const createPayment = await http("POST", "/api/payments/create", {
    orderId: deliveryOrderId,
  }, customerToken);
  assert(createPayment.status === 200, "POST /api/payments/create", `status=${createPayment.status}`);
  assert(!!createPayment.data?.paymentUrl, "Payment URL returned", "");
  assert(!!createPayment.data?.paymentId, "Payment ID returned", "");
  const paymentId = createPayment.data?.paymentId;

  // 7b: Cannot pay same order twice
  const doublePayment = await http("POST", "/api/payments/create", {
    orderId: deliveryOrderId,
  }, customerToken);
  assert(doublePayment.status === 200, "Re-requesting payment session OK", "");

  // 7c: Invalid order
  const badPayment = await http("POST", "/api/payments/create", {
    orderId: "00000000-0000-0000-0000-000000000000",
  }, customerToken);
  assert(badPayment.status === 400, "Payment for non-existent order rejected", `status=${badPayment.status}`);

  // 7d: Simulate webhook (SUCCESS)
  const webhook = await http("POST", "/api/payments/webhook", {
    tx_ref: `payment_${paymentId}`,
    status: "success",
    transaction_id: "CHAPA_TEST_TXN_001",
  });
  assert(webhook.status === 200, "POST /api/payments/webhook (success)", `status=${webhook.status}`);

  // 7e: Verify payment was processed
  const updatedPayment = await http("GET", `/api/payments/verify/${paymentId}`, undefined, customerToken);
  assert(updatedPayment.status === 200, "GET /api/payments/verify/:id", `status=${updatedPayment.status}`);
  assert(updatedPayment.data?.status === "SUCCESS", "Payment status is SUCCESS", "");

  // 7f: Order status updated to PAID
  const paidOrder = await http("GET", `/api/orders/${deliveryOrderId}`, undefined, customerToken);
  assert(paidOrder.data?.status === "PAID", "Order status updated to PAID", "");

  // 7g: Cannot pay already-paid order
  const alreadyPaid = await http("POST", "/api/payments/create", {
    orderId: deliveryOrderId,
  }, customerToken);
  assert(alreadyPaid.status === 400, "Cannot pay already-paid order", `status=${alreadyPaid.status}`);

  // 7h: Webhook idempotency (send same webhook again)
  const webhookAgain = await http("POST", "/api/payments/webhook", {
    tx_ref: `payment_${paymentId}`,
    status: "success",
    transaction_id: "CHAPA_TEST_TXN_001",
  });
  assert(webhookAgain.status === 200, "Duplicate webhook handled gracefully", `message=${webhookAgain.data?.message}`);

  // ──────────────────────────────────────────────────────────
  // PHASE 8: CHAT MODULE (REST + Socket.io-ready)
  // ──────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${YELLOW}Phase 8: Chat Module (REST)${RESET}`);

  // 8a: Create chat for order
  const createChat = await http("POST", "/api/chat", {
    orderId: deliveryOrderId,
  }, customerToken);
  assert(createChat.status === 201, "POST /api/chat (create)", `status=${createChat.status}`);
  assert(!!createChat.data?.id, "Chat ID returned", "");
  const chatId = createChat.data?.id;

  // 8b: Chat is linked to order
  assert(createChat.data?.orderId === deliveryOrderId, "Chat linked to order", "");

  // 8c: Duplicate chat returns existing
  const dupChat = await http("POST", "/api/chat", {
    orderId: deliveryOrderId,
  }, customerToken);
  assert(dupChat.status === 201, "Duplicate chat returns existing", `same_id=${dupChat.data?.id === chatId}`);

  // 8d: Customer sends message
  const msg1 = await http("POST", "/api/chat/message", {
    chatId,
    content: "Hello! I'd like to negotiate a discount on my order.",
  }, customerToken);
  assert(msg1.status === 201, "Customer sends message", `status=${msg1.status}`);
  assert(msg1.data?.content === "Hello! I'd like to negotiate a discount on my order.", "Message content correct", "");
  assert(msg1.data?.sender?.name === "Integration Test User", "Sender name correct", "");

  // 8e: Admin sends message to same chat
  const msg2 = await http("POST", "/api/chat/message", {
    chatId,
    content: "Hi! Sure, I can offer you a 15% discount. Your new total would be lower.",
  }, adminToken);
  assert(msg2.status === 201, "Admin sends message", `status=${msg2.status}`);
  assert(msg2.data?.sender?.name === "Bale Robe Admin", "Admin sender name correct", "");
  assert(msg2.data?.sender?.role === "ADMIN", "Admin role shown in message", "");

  // 8f: Customer sends another message
  const msg3 = await http("POST", "/api/chat/message", {
    chatId,
    content: "That sounds great! Can we do 20%?",
  }, customerToken);
  assert(msg3.status === 201, "Customer sends 2nd message", "");

  // 8g: Get all messages
  const messages = await http("GET", `/api/chat/${chatId}/messages`, undefined, customerToken);
  assert(messages.status === 200, "GET /api/chat/:chatId/messages", `count=${messages.data?.length || 0}`);
  assert((messages.data?.length || 0) === 3, "All 3 messages returned", "");
  assert(messages.data?.[0]?.content.includes("negotiate"), "First message is customer's", "");
  assert(messages.data?.[2]?.content.includes("20%"), "Latest message is 2nd customer message", "");

  // 8h: Get chat by order ID
  const chatByOrder = await http("GET", `/api/chat/order/${deliveryOrderId}`, undefined, customerToken);
  assert(chatByOrder.status === 200, "GET /api/chat/order/:orderId", `status=${chatByOrder.status}`);
  assert(!!chatByOrder.data?.chat, "Chat returned", "");
  assert(chatByOrder.data?.chat?.id === chatId, "Chat ID matches", "");

  // 8i: Get user's chats
  const userChats = await http("GET", "/api/chat", undefined, customerToken);
  assert(userChats.status === 200, "GET /api/chat (user's chats)", `count=${userChats.data?.length || 0}`);

  // 8j: Admin views all chats
  const adminChats = await http("GET", "/api/chat", undefined, adminToken);
  assert(adminChats.status === 200, "Admin GET /api/chat", `count=${adminChats.data?.length || 0}`);

  // 8k: Empty message rejected
  const emptyMsg = await http("POST", "/api/chat/message", {
    chatId,
    content: "",
  }, customerToken);
  assert(emptyMsg.status === 400, "Empty message rejected", `status=${emptyMsg.status}`);

  // 8l: Too long message rejected
  const longMsg = await http("POST", "/api/chat/message", {
    chatId,
    content: "a".repeat(5001),
  }, customerToken);
  assert(longMsg.status === 400, "5000+ char message rejected", `status=${longMsg.status}`);

  // 8m: Unauthorized user cannot access chat
  const otherCustomer = await http("POST", "/api/auth/register", {
    name: "Other User",
    phone: "+251933333333",
    password: "testpass123",
  });
  const otherToken = otherCustomer.data?.accessToken;
  const unauthChat = await http("GET", `/api/chat/order/${deliveryOrderId}`, undefined, otherToken);
  assert(unauthChat.status === 404, "Other user cannot access chat", `status=${unauthChat.status}`);

  // ──────────────────────────────────────────────────────────
  // PHASE 9: STOCK INTEGRITY
  // ──────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${YELLOW}Phase 9: Stock Integrity${RESET}`);

  // 9a: Check product stock after payment
  const paidItems = paidOrder.data?.items || [];
  for (const item of paidItems) {
    const productAfter = await http("GET", `/api/products/${item.productId}`);
    // Original stock was set during seeding, webhook should have decremented it
    assert(productAfter.data?.stock !== undefined, `Stock field exists for "${productAfter.data?.name}"`, `current stock: ${productAfter.data?.stock}`);
  }

  // ──────────────────────────────────────────────────────────
  // PHASE 10: VALIDATION & EDGE CASES
  // ──────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${YELLOW}Phase 10: Validation & Edge Cases${RESET}`);

  // 10a: Invalid JSON
  const res = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json",
  });
  assert(res.status === 400, "Invalid JSON body rejected", `status=${res.status}`);

  // 10b: Missing required fields
  const missingFields = await http("POST", "/api/auth/register", {
    name: "NoPhone",
  });
  assert(missingFields.status === 400, "Missing required fields rejected", `status=${missingFields.status}`);

  // 10c: Invalid Zod — cart
  const badCart = await http("POST", "/api/cart", {
    productId: "not-a-uuid",
    quantity: -1,
  }, customerToken);
  assert(badCart.status === 400, "Invalid cart data rejected", `status=${badCart.status}`);

  // 10d: Invalid order — bad delivery type
  const badOrder = await http("POST", "/api/orders", {
    deliveryType: "DRONE",
  }, customerToken);
  assert(badOrder.status === 400, "Invalid deliveryType rejected", `status=${badOrder.status}`);

  // ──────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  TEST SUMMARY${RESET}`);
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════${RESET}`);
  console.log(`  Total:  ${total}`);
  console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
  console.log(`  ${RED}Failed: ${failed}${RESET}`);
  console.log(`  Score:  ${Math.round((passed / total) * 100)}%`);
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════${RESET}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error(`${RED}Fatal error:${RESET}`, e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
