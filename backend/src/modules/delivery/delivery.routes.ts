import { Router } from "express";
import { getDeliveryFee } from "./delivery.controller";
import { validate } from "../../shared/utils/validate";
import { deliveryFeeSchema } from "../../shared/validators";

const router = Router();

router.post("/fee", validate(deliveryFeeSchema), getDeliveryFee);

export default router;
