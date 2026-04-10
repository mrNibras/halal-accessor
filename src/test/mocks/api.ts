import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock the API module ───
vi.mock("@/lib/api", () => ({
  authApi: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    getToken: vi.fn(() => null),
    removeToken: vi.fn(),
  },
  productsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getCategories: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  cartApi: {
    get: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  ordersApi: {
    create: vi.fn(),
    getMyOrders: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    updateStatus: vi.fn(),
  },
  paymentsApi: {
    create: vi.fn(),
    verify: vi.fn(),
  },
  chatApi: {
    getChats: vi.fn(),
    createChat: vi.fn(),
    getChatByOrder: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
  },
}));
