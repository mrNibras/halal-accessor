import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  authApi,
  productsApi,
  cartApi,
  ordersApi,
  paymentsApi,
  deliveryApi,
  chatApi,
  healthCheck,
} from "@/lib/api";

// ─── Mock fetch ───
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Token Management ───

  describe("Token management", () => {
    it("should return null when no token exists", () => {
      expect(authApi.getToken()).toBeNull();
    });

    it("should store and retrieve token", () => {
      localStorage.setItem("accessToken", "test-token-123");
      expect(authApi.getToken()).toBe("test-token-123");
    });

    it("should remove token on logout", () => {
      localStorage.setItem("accessToken", "test-token");
      authApi.logout();
      expect(authApi.getToken()).toBeNull();
    });
  });

  // ─── Request Helper ───

  describe("request helper", () => {
    it("should make GET request without auth header when no token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: "ok" }),
      });

      const result = await healthCheck();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/health"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
      expect(result).toEqual({ data: "ok" });
    });

    it("should include Authorization header when token exists", async () => {
      localStorage.setItem("accessToken", "my-jwt-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user: { id: "1" } }),
      });

      await authApi.getMe();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer my-jwt-token",
          }),
        })
      );
    });

    it("should throw error on non-OK response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: "Unauthorized" }),
      });

      await expect(authApi.getMe()).rejects.toThrow("Unauthorized");
    });

    it("should throw generic error when response has no JSON body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Not JSON")),
      });

      await expect(authApi.getMe()).rejects.toThrow("Request failed: 500");
    });
  });

  // ─── Auth API ───

  describe("authApi", () => {
    it("register should POST to /api/auth/register and store token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            user: { id: "1", name: "Test", phone: "+251900000000", role: "CUSTOMER" },
            accessToken: "new-token",
          }),
      });

      const result = await authApi.register("Test", "+251900000000", "password123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/register"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Test",
            phone: "+251900000000",
            password: "password123",
          }),
        })
      );
      expect(localStorage.getItem("accessToken")).toBe("new-token");
      expect(result.user.name).toBe("Test");
    });

    it("login should POST to /api/auth/login and store token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            user: { id: "1", name: "Test", phone: "+251900000000", role: "CUSTOMER" },
            accessToken: "login-token",
          }),
      });

      const result = await authApi.login("+251900000000", "password123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/login"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ phone: "+251900000000", password: "password123" }),
        })
      );
      expect(localStorage.getItem("accessToken")).toBe("login-token");
      expect(result.user.role).toBe("CUSTOMER");
    });

    it("getMe should GET /api/auth/me with auth header", async () => {
      localStorage.setItem("accessToken", "valid-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: "1",
            name: "Test User",
            phone: "+251900000000",
            role: "ADMIN",
            createdAt: "2024-01-01T00:00:00Z",
          }),
      });

      const user = await authApi.getMe();

      expect(user.role).toBe("ADMIN");
      expect(user.name).toBe("Test User");
    });
  });

  // ─── Products API ───

  describe("productsApi", () => {
    it("getAll should GET /api/products with optional query params", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{ id: "1", name: "Phone Case", price: 1500 }]),
      });

      const products = await productsApi.getAll({ category: "cat-1", search: "phone" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/products?category=cat-1&search=phone"),
        expect.any(Object)
      );
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe("Phone Case");
    });

    it("getAll should work without params", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await productsApi.getAll();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/products?"),
        expect.any(Object)
      );
    });

    it("getCategories should GET /api/products/categories", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            { id: "c1", name: "Cases", icon: "smartphone" },
            { id: "c2", name: "Chargers", icon: "zap" },
          ]),
      });

      const cats = await productsApi.getCategories();

      expect(cats).toHaveLength(2);
      expect(cats[0].icon).toBe("smartphone");
    });

    it("create should POST to /api/products", async () => {
      localStorage.setItem("accessToken", "admin-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "new-id", name: "New Product" }),
      });

      const result = await productsApi.create({
        name: "New Product",
        price: 2000,
        stock: 50,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/products"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "New Product", price: 2000, stock: 50 }),
        })
      );
      expect(result.name).toBe("New Product");
    });

    it("update should PUT to /api/products/:id", async () => {
      localStorage.setItem("accessToken", "admin-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "p1", name: "Updated" }),
      });

      await productsApi.update("p1", { name: "Updated", price: 3000 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/products/p1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ name: "Updated", price: 3000 }),
        })
      );
    });

    it("delete should DELETE /api/products/:id", async () => {
      localStorage.setItem("accessToken", "admin-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await productsApi.delete("p1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/products/p1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  // ─── Cart API ───

  describe("cartApi", () => {
    it("get should GET /api/cart", async () => {
      localStorage.setItem("accessToken", "token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            items: [
              { id: "ci1", productId: "p1", quantity: 2, product: { name: "Case", price: 1500 } },
            ],
          }),
      });

      const cart = await cartApi.get();

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(2);
    });

    it("addItem should POST to /api/cart", async () => {
      localStorage.setItem("accessToken", "token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "ci2" }),
      });

      await cartApi.addItem("p1", 3);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/cart"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ productId: "p1", quantity: 3 }),
        })
      );
    });

    it("updateItem should PUT to /api/cart/:itemId", async () => {
      localStorage.setItem("accessToken", "token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await cartApi.updateItem("ci1", 5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/cart/ci1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ quantity: 5 }),
        })
      );
    });

    it("removeItem should DELETE /api/cart/:itemId", async () => {
      localStorage.setItem("accessToken", "token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await cartApi.removeItem("ci1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/cart/ci1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  // ─── Orders API ───

  describe("ordersApi", () => {
    it("create should POST to /api/orders", async () => {
      localStorage.setItem("accessToken", "token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            id: "ord-1",
            totalAmount: 3000,
            deliveryFee: 0,
            finalAmount: 3000,
            deliveryType: "PICKUP",
          }),
      });

      const order = await ordersApi.create({ deliveryType: "PICKUP" });

      expect(order.id).toBe("ord-1");
      expect(order.deliveryFee).toBe(0);
    });

    it("getById should GET /api/orders/:id", async () => {
      localStorage.setItem("accessToken", "token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: "ord-1",
            status: "PENDING",
            items: [],
          }),
      });

      const order = await ordersApi.getById("ord-1");

      expect(order.status).toBe("PENDING");
    });

    it("updateStatus should PUT to /api/orders/:id/status", async () => {
      localStorage.setItem("accessToken", "token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "ord-1", status: "DELIVERED" }),
      });

      const result = await ordersApi.updateStatus("ord-1", "DELIVERED");

      expect(result.status).toBe("DELIVERED");
    });
  });

  // ─── Payments API ───

  describe("paymentsApi", () => {
    it("create should POST to /api/payments/create", async () => {
      localStorage.setItem("accessToken", "token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            paymentId: "pay-1",
            paymentUrl: "https://pay.chapa.co/checkout/abc123",
          }),
      });

      const result = await paymentsApi.create("ord-1");

      expect(result.paymentUrl).toContain("chapa.co");
    });

    it("verify should GET /api/payments/verify/:paymentId", async () => {
      localStorage.setItem("accessToken", "token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: "SUCCESS", transactionId: "tx-123" }),
      });

      const result = await paymentsApi.verify("pay-1");

      expect(result.status).toBe("SUCCESS");
    });
  });

  // ─── Chat API ───

  describe("chatApi", () => {
    it("sendMessage should POST to /api/chat/message", async () => {
      localStorage.setItem("accessToken", "token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            id: "msg-1",
            content: "Hello!",
            senderId: "user-1",
          }),
      });

      const msg = await chatApi.sendMessage("chat-1", "Hello!");

      expect(msg.content).toBe("Hello!");
    });

    it("getChatByOrder should GET /api/chat/order/:orderId", async () => {
      localStorage.setItem("accessToken", "token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "chat-1", orderId: "ord-1" }),
      });

      const chat = await chatApi.getChatByOrder("ord-1");

      expect(chat.id).toBe("chat-1");
    });
  });
});
