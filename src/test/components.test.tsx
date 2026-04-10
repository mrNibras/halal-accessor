import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";

// ─── Mock lucide-react icons ───
vi.mock("lucide-react", () => ({
  Send: () => <svg data-testid="send-icon" />,
  Package: () => <svg data-testid="package-icon" />,
  ShoppingCart: () => <svg data-testid="cart-icon" />,
  ArrowRight: () => <svg data-testid="arrow-icon" />,
  Smartphone: () => <svg data-testid="smartphone-icon" />,
  Zap: () => <svg data-testid="zap-icon" />,
  Headphones: () => <svg data-testid="headphones-icon" />,
  Shield: () => <svg data-testid="shield-icon" />,
  BatteryCharging: () => <svg data-testid="battery-icon" />,
  LayoutGrid: () => <svg data-testid="grid-icon" />,
  Eye: () => <svg data-testid="eye-icon" />,
  EyeOff: () => <svg data-testid="eyeoff-icon" />,
}));

describe("MessageBubble", () => {
  const defaultProps = {
    content: "Hello, is this item still available?",
    isOwn: false,
    timestamp: "2 minutes ago",
    senderName: "Ahmed",
  };

  it("should render message content", () => {
    render(<MessageBubble {...defaultProps} />);
    expect(screen.getByText("Hello, is this item still available?")).toBeInTheDocument();
  });

  it("should render sender name initial as avatar fallback", () => {
    render(<MessageBubble {...defaultProps} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("should render timestamp", () => {
    render(<MessageBubble {...defaultProps} />);
    expect(screen.getByText("2 minutes ago")).toBeInTheDocument();
  });

  it("should position own messages to the right (flex-row-reverse)", () => {
    const { container } = render(
      <MessageBubble {...defaultProps} isOwn={true} senderName="You" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("flex-row-reverse");
  });

  it("should position others' messages to the left (flex-row)", () => {
    const { container } = render(
      <MessageBubble {...defaultProps} isOwn={false} senderName="Ahmed" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("flex-row");
  });

  it("should handle long content with word break", () => {
    const longContent = "This is a very long message that should wrap properly and not overflow the container boundary";
    render(<MessageBubble content={longContent} isOwn={false} timestamp="now" senderName="Test" />);
    expect(screen.getByText(longContent)).toBeInTheDocument();
  });
});

describe("ChatInput", () => {
  it("should render textarea and send button", () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should call onSend with trimmed message when send button clicked", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "  Hello world  " } });

    const sendButton = screen.getByRole("button");
    fireEvent.click(sendButton);

    expect(onSend).toHaveBeenCalledWith("Hello world");
  });

  it("should call onSend when Enter is pressed", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSend).toHaveBeenCalledWith("Hello");
  });

  it("should NOT send when Shift+Enter is pressed (newline)", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "Line 1\nLine 2" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it("should NOT send empty message", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const sendButton = screen.getByRole("button");
    fireEvent.click(sendButton);

    expect(onSend).not.toHaveBeenCalled();
  });

  it("should NOT send whitespace-only message", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "   " } });

    const sendButton = screen.getByRole("button");
    fireEvent.click(sendButton);

    expect(onSend).not.toHaveBeenCalled();
  });

  it("should clear textarea after sending", () => {
    render(<ChatInput onSend={vi.fn()} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "Send this" } });

    const sendButton = screen.getByRole("button");
    fireEvent.click(sendButton);

    expect((textarea as HTMLTextAreaElement).value).toBe("");
  });

  it("should disable send button when disabled prop is true", () => {
    render(<ChatInput onSend={vi.fn()} disabled={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByPlaceholderText("Type a message...")).toBeDisabled();
  });

  it("should disable send button when message is empty", () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should enable send button when message has content", () => {
    render(<ChatInput onSend={vi.fn()} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "Ready to send" } });

    expect(screen.getByRole("button")).not.toBeDisabled();
  });
});
