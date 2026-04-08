import { Response } from "express";
import * as chatService from "./chat.service";
import { sendMessageSchema, createChatSchema } from "../../shared/validators";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

export const createChat = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = createChatSchema.parse(req.body);

    const chat = await chatService.createChat(req.user!.id, orderId, req.user!.role);

    res.status(201).json(chat);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getChat = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.orderId as string;

    const chat = await chatService.getChatByOrderId(req.user!.id, orderId, req.user!.role);

    res.json(chat);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;

    const messages = await chatService.getChatMessages(req.user!.id, chatId, req.user!.role);

    res.json(messages);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

export const sendHttpMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId, content } = sendMessageSchema.parse(req.body);

    const message = await chatService.sendMessage(chatId, req.user!.id, content);

    res.status(201).json(message);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getUserChats = async (req: AuthRequest, res: Response) => {
  const chats = await chatService.getUserChats(req.user!.id, req.user!.role);

  res.json(chats);
};
