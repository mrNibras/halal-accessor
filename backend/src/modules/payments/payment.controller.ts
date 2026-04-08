import { Request, Response } from "express";
import { createPaymentSession, handleWebhook, verifyPayment } from "./payment.service";
import { createPaymentSchema } from "../../shared/validators";

export const createPayment = async (req: Request, res: Response) => {
  try {
    const { orderId } = createPaymentSchema.parse(req.body);

    const result = await createPaymentSession(orderId);

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const paymentWebhook = async (req: Request, res: Response) => {
  try {
    const result = await handleWebhook(req.body);

    res.json(result);
  } catch (err: any) {
    console.error("Webhook error:", err);
    // Always return 200 to prevent gateway retries
    res.status(200).json({ message: "Webhook received", error: err.message });
  }
};

export const verifyPaymentController = async (req: Request, res: Response) => {
  try {
    const paymentId = req.params.paymentId as string;

    const payment = await verifyPayment(paymentId);

    res.json(payment);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
