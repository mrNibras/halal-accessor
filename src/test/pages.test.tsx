import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "@/pages/NotFound";

// ─── Mock lucide-react ───
vi.mock("lucide-react", () => ({
  Send: () => <svg />,
  Package: () => <svg />,
  ShoppingCart: () => <svg />,
  ArrowRight: () => <svg />,
}));

describe("NotFound Page", () => {
  it("should render 404 heading", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("should render 'Page not found' message", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });

  it("should have a link back to home", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: /return to home/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("should log error to console for the attempted route", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={["/nonexistent-page"]}>
        <NotFound />
      </MemoryRouter>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "404 Error: User attempted to access non-existent route:",
      "/nonexistent-page"
    );

    consoleSpy.mockRestore();
  });
});
