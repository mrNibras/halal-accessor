import { Router } from "express";
import { createPayment, paymentWebhook, verifyPaymentController } from "./payment.controller";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/utils/validate";
import { createPaymentSchema } from "../../shared/validators";

const router = Router();

router.post("/create", auth(), validate(createPaymentSchema), createPayment);
router.get("/verify/:paymentId", auth(), verifyPaymentController);
router.post("/webhook", paymentWebhook); // No auth — called by gateway

export default router;
