import { Router } from "express";
import { getCart, addItem, updateItem, removeItem, clearCartItems } from "./cart.controller";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/utils/validate";
import { cartItemSchema, updateCartItemSchema } from "../../shared/validators";

const router = Router();

router.use(auth());

router.get("/", getCart);
router.post("/", validate(cartItemSchema), addItem);
router.put("/:itemId", validate(updateCartItemSchema), updateItem);
router.delete("/:itemId", removeItem);
router.delete("/", clearCartItems);

export default router;
