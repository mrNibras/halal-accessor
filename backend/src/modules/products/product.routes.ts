import { Router } from "express";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
} from "./product.controller";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/utils/validate";
import { createProductSchema, updateProductSchema } from "../../shared/validators";

const router = Router();

router.get("/", getProducts);
router.get("/categories", getCategories);
router.get("/:id", getProduct);

router.post("/", auth(["ADMIN"]), validate(createProductSchema), createProduct);
router.post("/categories", auth(["ADMIN"]), createCategory);
router.put("/:id", auth(["ADMIN"]), validate(updateProductSchema), updateProduct);
router.delete("/:id", auth(["ADMIN"]), deleteProduct);

export default router;
