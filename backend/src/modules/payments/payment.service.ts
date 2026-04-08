import axios from "axios";
import { prisma } from "../../config/prisma";

export const createPaymentSession = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, items: { include: { product: true } } },
  });

  if (!order) throw new Error("Order not found");
  if (order.status !== "PENDING") throw new Error("Order already processed");

  // Check if payment already exists
  const existingPayment = await prisma.payment.findUnique({
    where: { orderId },
  });

  if (existingPayment && existingPayment.status === "SUCCESS") {
    throw new Error("Order already paid");
  }

  // Create or get payment record
  let payment = existingPayment;
  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        orderId,
        amount: order.finalAmount,
        provider: "CHAPA",
      },
    });
  }

  // Initialize Chapa payment
  const chapaUrl = await initializeChapaPayment(order, payment.id);

  payment = await prisma.payment.update({
    where: { id: payment.id },
    data: { checkoutUrl: chapaUrl },
  });

  return { paymentUrl: chapaUrl, paymentId: payment.id };
};

const initializeChapaPayment = async (order: any, paymentId: string): Promise<string> => {
  if (
    !process.env.CHAPA_SECRET_KEY ||
    process.env.CHAPA_SECRET_KEY === "your_chapa_secret_key_here"
  ) {
    // Return a simulated payment URL for development
    return `${process.env.FRONTEND_URL}/payment/simulate?paymentId=${paymentId}`;
  }

  try {
    const response = await axios.post(
      `${process.env.CHAPA_BASE_URL}/v1/checkout`,
      {
        amount: String(order.finalAmount / 100), // Convert from smallest unit
        currency: "ETB",
        email: order.user.email || "customer@example.com",
        first_name: order.user.name,
        tx_ref: `payment_${paymentId}`,
        callback_url: process.env.CHAPA_CALLBACK_URL,
        return_url: `${process.env.FRONTEND_URL}/payment/callback?orderId=${order.id}`,
        customization: {
          title: "HalalAccessor Payment",
          description: `Order #${order.id.slice(0, 8)}`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.status === "success" && response.data.data?.checkout_url) {
      return response.data.data.checkout_url;
    }

    throw new Error("Failed to create Chapa payment session");
  } catch (error: any) {
    console.error("Chapa API error:", error.response?.data || error.message);
    throw new Error("Payment gateway error");
  }
};

export const handleWebhook = async (payload: any) => {
  const { tx_ref, status, transaction_id } = payload;

  if (!tx_ref || !status) {
    throw new Error("Invalid webhook payload");
  }

  const paymentId = tx_ref.replace("payment_", "");

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });

  if (!payment) throw new Error("Payment not found");

  // Idempotency: prevent double processing
  if (payment.status === "SUCCESS") {
    return { message: "Already processed" };
  }

  if (status === "success") {
    await prisma.$transaction(async (tx) => {
      // 1. Update payment
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: "SUCCESS", transactionId: transaction_id },
      });

      // 2. Update order
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: "PAID" },
      });

      // 3. Reduce stock
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: payment.orderId },
      });

      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // 4. Log the payment
      await tx.paymentLog.create({
        data: {
          paymentId,
          userId: payment.order.userId,
          amount: payment.amount,
          status: "SUCCESS",
          message: `Transaction ID: ${transaction_id}`,
        },
      });
    });

    return { message: "Payment processed successfully" };
  } else {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "FAILED" },
    });

    await prisma.paymentLog.create({
      data: {
        paymentId,
        userId: payment.order.userId,
        amount: payment.amount,
        status: "FAILED",
        message: `Payment failed: ${status}`,
      },
    });

    return { message: "Payment marked as failed" };
  }
};

export const verifyPayment = async (paymentId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });

  if (!payment) throw new Error("Payment not found");

  // If payment is still pending, try to verify with Chapa
  if (payment.status === "PENDING" && payment.transactionId) {
    try {
      const response = await axios.get(
        `${process.env.CHAPA_BASE_URL}/v1/transactions/verify/${payment.transactionId}`,
        {
          headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
        }
      );

      if (response.data.status === "success" && response.data.data?.status === "success") {
        await handleWebhook({
          tx_ref: `payment_${paymentId}`,
          status: "success",
          transaction_id: payment.transactionId,
        });

        return { ...payment, status: "SUCCESS" };
      }
    } catch (error) {
      console.error("Chapa verification error:", error);
    }
  }

  return payment;
};
