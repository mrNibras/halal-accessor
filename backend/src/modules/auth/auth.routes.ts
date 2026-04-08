import { Router } from "express";
import { register, login, refreshToken, getMe } from "./auth.controller";
import { validate } from "../../shared/utils/validate";
import { registerSchema, loginSchema, refreshTokenSchema } from "../../shared/validators";
import { auth } from "../../shared/middleware/auth.middleware";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshTokenSchema), refreshToken);
router.get("/me", auth(), getMe);

export default router;
