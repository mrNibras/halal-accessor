import { Response } from "express";
import * as orderService from "./order.service";
import { createOrderSchema } from "../../shared/validators";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createOrderSchema.parse(req.body);

    const order = await orderService.createOrder(userId, data);

    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response) => {
  const orders = await orderService.getUserOrders(req.user!.id);

  res.json(orders);
};

export const getOrder = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.id as string;
    const order = await orderService.getOrder(req.user!.id, orderId);

    res.json(order);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

export const getAllOrders = async (_req: AuthRequest, res: Response) => {
  const orders = await orderService.getAllOrders();

  res.json(orders);
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.id as string;
    const { status } = req.body;

    if (!["PENDING", "PAID", "PROCESSING", "DELIVERED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await orderService.updateOrderStatus(orderId, status);

    res.json(order);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
