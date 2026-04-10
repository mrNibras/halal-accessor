import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mock the API module before importing hooks ───
const mockRegister = vi.fn();
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockGetMe = vi.fn();
const mockGetToken = vi.fn(() => null);
const mockRemoveToken = vi.fn();

vi.mock("@/lib/api", () => ({
  authApi: {
    get register() {
      return mockRegister;
    },
    get login() {
      return mockLogin;
    },
    get logout() {
      return mockLogout;
    },
    get getMe() {
      return mockGetMe;
    },
    get getToken() {
      return mockGetToken;
    },
    get removeToken() {
      return mockRemoveToken;
    },
  },
  productsApi: { getCategories: vi.fn(() => Promise.resolve([])) },
  cartApi: {
    get: vi.fn(() => Promise.resolve({ items: [] })),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Send: () => <svg />,
  Package: () => <svg />,
  ShoppingCart: () => <svg />,
  ArrowRight: () => <svg />,
  Eye: () => <svg />,
  EyeOff: () => <svg />,
  Smartphone: () => <svg />,
  Zap: () => <svg />,
  Headphones: () => <svg />,
  Shield: () => <svg />,
  BatteryCharging: () => <svg />,
  LayoutGrid: () => <svg />,
}));

// Import hooks AFTER mocks
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider, useCart } from "@/hooks/useCart";

const createWrapper = (children: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("useAuth Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetToken.mockReturnValue(null);
  });

  function TestAuthComponent() {
    const { user, loading, signUp, signIn, signOut } = useAuth();
    return (
      <div>
        <span data-testid="loading">{String(loading)}</span>
        <span data-testid="user">{user ? user.name : "none"}</span>
        <span data-testid="role">{user?.role ?? "none"}</span>
        <button onClick={() => signUp("Test", "+251900000000", "pass123")}>Sign Up</button>
        <button onClick={() => signIn("+251900000000", "pass123")}>Sign In</button>
        <button onClick={signOut}>Sign Out</button>
      </div>
    );
  }

  it("should start with loading=false when no token exists", () => {
    render(createWrapper(<TestAuthComponent />));
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("should start with user=null when no token exists", () => {
    render(createWrapper(<TestAuthComponent />));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("should register user and set user state", async () => {
    const mockUser = { id: "1", name: "Test", phone: "+251900000000", role: "CUSTOMER", createdAt: "2024-01-01" };
    mockRegister.mockResolvedValue({ user: mockUser, accessToken: "token-123" });

    render(createWrapper(<TestAuthComponent />));
    await act(async () => {
      screen.getByText("Sign Up").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("Test");
    });
    expect(mockRegister).toHaveBeenCalledWith("Test", "+251900000000", "pass123");
  });

  it("should login user and set user state", async () => {
    const mockUser = { id: "1", name: "Ahmed", phone: "+251900000000", role: "ADMIN", createdAt: "2024-01-01" };
    mockLogin.mockResolvedValue({ user: mockUser, accessToken: "token-456" });

    render(createWrapper(<TestAuthComponent />));
    await act(async () => {
      screen.getByText("Sign In").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("Ahmed");
      expect(screen.getByTestId("role")).toHaveTextContent("ADMIN");
    });
  });

  it("should sign out and clear user state", async () => {
    // First login
    mockLogin.mockResolvedValue({
      user: { id: "1", name: "Test", phone: "+251900000000", role: "CUSTOMER", createdAt: "2024-01-01" },
      accessToken: "token",
    });

    render(createWrapper(<TestAuthComponent />));
    await act(async () => {
      screen.getByText("Sign In").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("Test");
    });

    // Then sign out
    await act(async () => {
      screen.getByText("Sign Out").click();
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("should throw error when used outside AuthProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestAuthComponent />);
    }).toThrow("useAuth must be used within AuthProvider");

    consoleSpy.mockRestore();
  });
});

describe("useCart Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockReturnValue(null);
  });

  function TestCartComponent() {
    const { items, totalItems, totalPrice, addToCart, updateQuantity, removeFromCart, isLoading } = useCart();
    return (
      <div>
        <span data-testid="loading">{String(isLoading)}</span>
        <span data-testid="total-items">{totalItems}</span>
        <span data-testid="total-price">{totalPrice}</span>
        <span data-testid="item-count">{items.length}</span>
        <button onClick={() => addToCart("prod-1")}>Add Item</button>
        <button onClick={() => updateQuantity("item-1", 5)}>Update Qty</button>
        <button onClick={() => removeFromCart("item-1")}>Remove</button>
      </div>
    );
  }

  it("should start with zero totals when cart is empty", () => {
    render(createWrapper(<TestCartComponent />));
    expect(screen.getByTestId("total-items")).toHaveTextContent("0");
    expect(screen.getByTestId("total-price")).toHaveTextContent("0");
    expect(screen.getByTestId("item-count")).toHaveTextContent("0");
  });

  it("should throw error when used outside CartProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    expect(() => {
      render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <TestCartComponent />
            </AuthProvider>
          </QueryClientProvider>
        </MemoryRouter>
      );
    }).toThrow("useCart must be used within CartProvider");

    consoleSpy.mockRestore();
  });
});
