// ─── Backend API client ───

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─── Token management ───
const getToken = (): string | null => localStorage.getItem("accessToken");
const setToken = (token: string) => localStorage.setItem("accessToken", token);
const removeToken = () => localStorage.removeItem("accessToken");

// ─── Helper: fetch wrapper with auth ───
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json();
}

// ─── Auth API ───
export const authApi = {
  register: (name: string, phone: string, password: string) =>
    request<{ user: any; accessToken: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, phone, password }),
    }).then((res) => {
      setToken(res.accessToken);
      return res;
    }),

  login: (phone: string, password: string) =>
    request<{ user: any; accessToken: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    }).then((res) => {
      setToken(res.accessToken);
      return res;
    }),

  logout: () => {
    removeToken();
  },

  getMe: () => request<any>("/api/auth/me"),

  getToken,
  removeToken,
};

// ─── Products API ───
export const productsApi = {
  getAll: (params?: {
    category?: string;
    search?: string;
    featured?: boolean;
    minPrice?: number;
    maxPrice?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.search) qs.set("search", params.search);
    if (params?.featured) qs.set("featured", "true");
    if (params?.minPrice) qs.set("minPrice", String(params.minPrice));
    if (params?.maxPrice) qs.set("maxPrice", String(params.maxPrice));
    return request<any[]>(`/api/products?${qs.toString()}`);
  },

  getById: (id: string) => request<any>(`/api/products/${id}`),

  getCategories: () => request<any[]>("/api/products/categories"),

  create: (data: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    imageUrl?: string;
    categoryId?: string;
  }) =>
    request<any>("/api/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      stock?: number;
      imageUrl?: string;
      categoryId?: string;
    }
  ) =>
    request<any>(`/api/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<any>(`/api/products/${id}`, {
      method: "DELETE",
    }),

  createCategory: (data: { name: string; description?: string; icon?: string }) =>
    request<any>("/api/products/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Cart API ───
export const cartApi = {
  get: () => request<any>("/api/cart"),

  addItem: (productId: string, quantity: number) =>
    request<any>("/api/cart", {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    }),

  updateItem: (itemId: string, quantity: number) =>
    request<any>(`/api/cart/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    }),

  removeItem: (itemId: string) =>
    request<any>(`/api/cart/${itemId}`, {
      method: "DELETE",
    }),

  clear: () =>
    request<any>("/api/cart", {
      method: "DELETE",
    }),
};

// ─── Orders API ───
export const ordersApi = {
  create: (data: {
    deliveryType: "PICKUP" | "DELIVERY";
    latitude?: number;
    longitude?: number;
  }) =>
    request<any>("/api/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMyOrders: () => request<any[]>("/api/orders/my-orders"),

  getById: (id: string) => request<any>(`/api/orders/${id}`),

  getAll: () => request<any[]>("/api/orders"),

  updateStatus: (orderId: string, status: string) =>
    request<any>(`/api/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};

// ─── Payments API ───
export const paymentsApi = {
  create: (orderId: string) =>
    request<{ paymentId: string; paymentUrl: string }>("/api/payments/create", {
      method: "POST",
      body: JSON.stringify({ orderId }),
    }),

  verify: (paymentId: string) =>
    request<any>(`/api/payments/verify/${paymentId}`),
};

// ─── Delivery API ───
export const deliveryApi = {
  calculateFee: (lat: number, lng: number) =>
    request<{ distanceKm: number; deliveryFee: number }>("/api/delivery/fee", {
      method: "POST",
      body: JSON.stringify({ lat, lng }),
    }),
};

// ─── Chat API (REST) ───
export const chatApi = {
  getChats: () => request<any[]>("/api/chat"),

  createChat: (orderId: string) =>
    request<any>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ orderId }),
    }),

  getChatByOrder: (orderId: string) =>
    request<any>(`/api/chat/order/${orderId}`),

  getMessages: (chatId: string) =>
    request<any[]>(`/api/chat/${chatId}/messages`),

  sendMessage: (chatId: string, content: string) =>
    request<any>("/api/chat/message", {
      method: "POST",
      body: JSON.stringify({ chatId, content }),
    }),
};

// ─── Health check ───
export const healthCheck = () =>
  request<{ status: string; timestamp: string }>("/health");
