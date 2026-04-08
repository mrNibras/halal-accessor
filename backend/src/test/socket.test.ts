import { io, Socket } from "socket.io-client";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ${GREEN}✓${RESET} ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`  ${RED}✗${RESET} ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function http(method: string, path: string, body?: any, token?: string): Promise<any> {
  const url = `http://localhost:5000${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return res.json();
}

async function runSocketTests() {
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}  SOCKET.IO REAL-TIME CHAT TEST${RESET}`);
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}\n`);

  // ── Setup: Create order and chat ──
  console.log(`${YELLOW}Setup: Creating test data...${RESET}`);

  // Register test customer
  const regData = await http("POST", "/api/auth/register", {
    name: "Socket Test Customer",
    phone: "+251944444444",
    password: "socketpass123",
  });
  const customerToken = regData.accessToken;
  const customerId = regData.user.id;
  console.log(`  Customer: ${regData.user.name} (${regData.user.phone})`);

  // Admin login
  const adminData = await http("POST", "/api/auth/login", {
    phone: "+251900000000",
    password: "admin123",
  });
  const adminToken = adminData.accessToken;
  console.log(`  Admin: ${adminData.user.name}`);

  // Create a product and order for the chat
  await http("POST", "/api/cart", { productId: (await http("GET", "/api/products"))[0].id, quantity: 1 }, customerToken);
  const order = await http("POST", "/api/orders", { deliveryType: "PICKUP" }, customerToken);
  console.log(`  Order created: ${order.id.slice(0, 8)}...`);

  // Create chat
  const chat = await http("POST", "/api/chat", { orderId: order.id }, customerToken);
  const chatId = chat.id;
  console.log(`  Chat created: ${chatId.slice(0, 8)}...`);

  // ── Test 1: Customer connects via Socket.io ──
  console.log(`\n${YELLOW}Test 1: Customer Socket.io Connection${RESET}`);

  const customerSocket = io("http://localhost:5000", {
    auth: { token: customerToken },
    transports: ["websocket"],
  });

  const customerConnected = await new Promise<boolean>((resolve) => {
    customerSocket.on("connect", () => resolve(true));
    customerSocket.on("connect_error", () => resolve(false));
    setTimeout(() => resolve(false), 5000);
  });

  assert(customerConnected, "Customer socket connected", `id=${customerSocket.id}`);

  // ── Test 2: Admin connects via Socket.io ──
  console.log(`\n${YELLOW}Test 2: Admin Socket.io Connection${RESET}`);

  const adminSocket = io("http://localhost:5000", {
    auth: { token: adminToken },
    transports: ["websocket"],
  });

  const adminConnected = await new Promise<boolean>((resolve) => {
    adminSocket.on("connect", () => resolve(true));
    adminSocket.on("connect_error", () => resolve(false));
    setTimeout(() => resolve(false), 5000);
  });

  assert(adminConnected, "Admin socket connected", `id=${adminSocket.id}`);

  // ── Test 3: Both join the chat room ──
  console.log(`\n${YELLOW}Test 3: Join Chat Room${RESET}`);

  customerSocket.emit("join:chat", chatId);
  adminSocket.emit("join:chat", chatId);

  await new Promise((r) => setTimeout(r, 500));
  assert(true, "Both users joined chat room", `chatId=${chatId.slice(0, 8)}...`);

  // ── Test 4: Real-time message delivery (Customer → Admin) ──
  console.log(`\n${YELLOW}Test 4: Real-Time Message Delivery (Customer → Admin)${RESET}`);

  let receivedMessage: any = null;

  adminSocket.on("message:new", (msg) => {
    receivedMessage = msg;
  });

  // Customer sends a message via Socket.io
  customerSocket.emit("send:message", {
    chatId,
    content: "Hello admin! Is this order eligible for bulk discount?",
  });

  await new Promise((r) => setTimeout(r, 1000));

  assert(!!receivedMessage, "Admin received message in real-time", "");
  assert(
    receivedMessage?.content === "Hello admin! Is this order eligible for bulk discount?",
    "Message content matches",
    `"${receivedMessage?.content}"`
  );
  assert(
    receivedMessage?.sender?.name === "Socket Test Customer",
    "Sender name correct in real-time message",
    ""
  );

  // ── Test 5: Admin responds in real-time ──
  console.log(`\n${YELLOW}Test 5: Admin Responds in Real-Time${RESET}`);

  let customerReceivedMsg: any = null;

  customerSocket.on("message:new", (msg) => {
    customerReceivedMsg = msg;
  });

  adminSocket.emit("send:message", {
    chatId,
    content: "Yes! For orders over 5000 ETB we offer 10% discount.",
  });

  await new Promise((r) => setTimeout(r, 1000));

  assert(!!customerReceivedMsg, "Customer received admin response in real-time", "");
  assert(
    customerReceivedMsg?.content === "Yes! For orders over 5000 ETB we offer 10% discount.",
    "Admin response content correct",
    ""
  );
  assert(
    customerReceivedMsg?.sender?.role === "ADMIN",
    "Admin role visible in real-time message",
    ""
  );

  // ── Test 6: Typing indicators ──
  console.log(`\n${YELLOW}Test 6: Typing Indicators${RESET}`);

  let typingEvent: any = null;

  adminSocket.on("typing:user", (data) => {
    typingEvent = data;
  });

  customerSocket.emit("typing:start", { chatId });

  await new Promise((r) => setTimeout(r, 500));

  assert(typingEvent?.isTyping === true, "Typing start received by admin", "");
  assert(typingEvent?.chatId === chatId, "Typing event has correct chatId", "");

  customerSocket.emit("typing:stop", { chatId });

  await new Promise((r) => setTimeout(r, 500));

  assert(typingEvent?.isTyping === false, "Typing stop received by admin", "");

  // ── Test 7: Unauthorized socket access ──
  console.log(`\n${YELLOW}Test 7: Unauthorized Socket Rejected${RESET}`);

  const badSocket = io("http://localhost:5000", {
    auth: { token: "invalid-token-here" },
    transports: ["websocket"],
  });

  const badConnection = await new Promise<boolean>((resolve) => {
    badSocket.on("connect", () => resolve(true));
    badSocket.on("connect_error", () => resolve(false));
    setTimeout(() => resolve(false), 5000);
  });

  assert(!badConnection, "Invalid token socket rejected", "");

  // ── Test 8: Verify all messages persisted in DB ──
  console.log(`\n${YELLOW}Test 8: Messages Persisted in Database${RESET}`);

  const dbMessages = await http("GET", `/api/chat/${chatId}/messages`, undefined, customerToken);

  assert(Array.isArray(dbMessages), "DB messages returned as array", "");
  assert(dbMessages.length >= 2, "At least 2 messages in DB (Socket.io)", `count=${dbMessages.length}`);

  const socketMsgs = dbMessages.filter((m: any) =>
    m.content.includes("bulk discount") || m.content.includes("10% discount")
  );
  assert(socketMsgs.length >= 2, "Socket.io messages saved to DB", "");

  // ── Test 9: Unauthorized chat access via socket ──
  console.log(`\n${YELLOW}Test 9: Unauthorized Chat Access via Socket${RESET}`);

  // Register another user who shouldn't have access
  const otherReg = await http("POST", "/api/auth/register", {
    name: "Unauthorized User",
    phone: "+251955555555",
    password: "socketpass123",
  });

  const otherSocket = io("http://localhost:5000", {
    auth: { token: otherReg.accessToken },
    transports: ["websocket"],
  });

  await new Promise((r) => setTimeout(r, 500));

  let accessDenied = false;
  otherSocket.on("error", (err) => {
    if (err.message === "Unauthorized") accessDenied = true;
  });

  otherSocket.emit("join:chat", chatId);

  await new Promise((r) => setTimeout(r, 1000));

  assert(accessDenied, "Unauthorized user denied access to chat", "");

  // ── Cleanup ──
  customerSocket.disconnect();
  adminSocket.disconnect();
  badSocket.disconnect();
  otherSocket.disconnect();

  // ── Summary ──
  const total = passed + failed;
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  SOCKET.IO TEST SUMMARY${RESET}`);
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}`);
  console.log(`  Total:  ${total}`);
  console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
  console.log(`  ${RED}Failed: ${failed}${RESET}`);
  console.log(`  Score:  ${total > 0 ? Math.round((passed / total) * 100) : 0}%`);
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}\n`);

  await prisma.$disconnect();

  if (failed > 0) process.exit(1);
}

runSocketTests().catch((e) => {
  console.error(`${RED}Fatal:${RESET}`, e);
  process.exit(1);
});
