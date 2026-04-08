import { Router } from "express";
import {
  createOrder,
  getUserOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
} from "./order.controller";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/utils/validate";
import { createOrderSchema } from "../../shared/validators";

const router = Router();

router.post("/", auth(), validate(createOrderSchema), createOrder);
router.get("/my-orders", auth(), getUserOrders);
router.get("/:id", auth(), getOrder);

// Admin routes
router.get("/", auth(["ADMIN"]), getAllOrders);
router.put("/:id/status", auth(["ADMIN"]), updateOrderStatus);

export default router;
