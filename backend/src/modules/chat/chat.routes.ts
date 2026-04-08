import { Router } from "express";
import {
  createChat,
  getChat,
  getMessages,
  sendHttpMessage,
  getUserChats,
} from "./chat.controller";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/utils/validate";
import { sendMessageSchema, createChatSchema } from "../../shared/validators";

const router = Router();

router.use(auth());

router.get("/", getUserChats);
router.post("/", validate(createChatSchema), createChat);
router.get("/order/:orderId", getChat);
router.get("/:chatId/messages", getMessages);
router.post("/message", validate(sendMessageSchema), sendHttpMessage);

export default router;
