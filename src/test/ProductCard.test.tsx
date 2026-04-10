import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProductCard from "@/components/ProductCard";

// ─── Mock the API and hooks ───
const mockAddToCart = vi.fn();
const mockUser = vi.fn(() => null);

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser(), loading: false, signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("@/hooks/useCart", () => ({
  useCart: () => ({
    addToCart: mockAddToCart,
    items: [],
    isLoading: false,
    totalItems: 0,
    totalPrice: 0,
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
  }),
}));

vi.mock("lucide-react", () => ({
  ShoppingCart: () => <svg data-testid="cart-icon" />,
  Package: () => <svg data-testid="package-icon" />,
}));

vi.mock("@/lib/api", () => ({
  authApi: { getToken: vi.fn(() => null), removeToken: vi.fn() },
  productsApi: { getCategories: vi.fn(() => Promise.resolve([])) },
  cartApi: { get: vi.fn(() => Promise.resolve({ items: [] })), addItem: vi.fn(), updateItem: vi.fn(), removeItem: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createWrapper = (children: React.ReactNode) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );
};

const mockProduct = {
  id: "prod-1",
  name: "iPhone 15 Pro Silicone Case",
  description: "Official silicone case with soft-touch finish",
  price: 1500,
  stock: 50,
  imageUrl: null,
};

describe("ProductCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.mockReturnValue(null);
    mockNavigate.mockReset();
  });

  it("should render product name", () => {
    render(createWrapper(<ProductCard product={mockProduct} />));
    expect(screen.getByText("iPhone 15 Pro Silicone Case")).toBeInTheDocument();
  });

  it("should render product description", () => {
    render(createWrapper(<ProductCard product={mockProduct} />));
    expect(screen.getByText(/Official silicone case/i)).toBeInTheDocument();
  });

  it("should render formatted price", () => {
    render(createWrapper(<ProductCard product={mockProduct} />));
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.getByText("ETB")).toBeInTheDocument();
  });

  it("should show 'Add' button when in stock", () => {
    render(createWrapper(<ProductCard product={mockProduct} />));
    expect(screen.getByText("Add")).toBeInTheDocument();
  });

  it("should show 'Out' button when out of stock", () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    render(createWrapper(<ProductCard product={outOfStockProduct} />));
    expect(screen.getByText("Out")).toBeInTheDocument();
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("should disable add button when out of stock", () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    render(createWrapper(<ProductCard product={outOfStockProduct} />));
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should render placeholder icon when no image URL", () => {
    render(createWrapper(<ProductCard product={mockProduct} />));
    expect(screen.getByTestId("package-icon")).toBeInTheDocument();
  });

  it("should render product image when imageUrl is provided", () => {
    const productWithImage = { ...mockProduct, imageUrl: "https://example.com/case.jpg" };
    render(createWrapper(<ProductCard product={productWithImage} />));
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/case.jpg");
    expect(img).toHaveAttribute("alt", "iPhone 15 Pro Silicone Case");
  });

  it("should navigate to /auth when unauthenticated user clicks Add", () => {
    mockUser.mockReturnValue(null);
    render(createWrapper(<ProductCard product={mockProduct} />));

    fireEvent.click(screen.getByRole("button"));

    expect(mockNavigate).toHaveBeenCalledWith("/auth");
    expect(mockAddToCart).not.toHaveBeenCalled();
  });

  it("should call addToCart when authenticated user clicks Add", () => {
    mockUser.mockReturnValue({ id: "user-1", name: "Test", phone: "+251900000000", role: "CUSTOMER" });
    render(createWrapper(<ProductCard product={mockProduct} />));

    fireEvent.click(screen.getByRole("button"));

    expect(mockAddToCart).toHaveBeenCalledWith("prod-1");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should not call addToCart when product is out of stock", () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    mockUser.mockReturnValue({ id: "user-1", name: "Test", phone: "+251900000000", role: "CUSTOMER" });
    render(createWrapper(<ProductCard product={outOfStockProduct} />));

    fireEvent.click(screen.getByRole("button"));

    expect(mockAddToCart).not.toHaveBeenCalled();
  });

  it("should handle products with no description", () => {
    const noDescProduct = { ...mockProduct, description: null };
    render(createWrapper(<ProductCard product={noDescProduct} />));
    // Should not throw or crash
    expect(screen.getByText("iPhone 15 Pro Silicone Case")).toBeInTheDocument();
  });

  it("should apply opacity class when out of stock", () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    render(createWrapper(<ProductCard product={outOfStockProduct} />));
    const button = screen.getByRole("button");
    expect(button).toHaveClass("opacity-50");
  });
});
