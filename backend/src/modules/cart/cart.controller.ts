import { Response } from "express";
import * as cartService from "./cart.service";
import { cartItemSchema, updateCartItemSchema } from "../../shared/validators";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

export const getCart = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const cart = await cartService.getCartWithTotals(userId);

  res.json(cart);
};

export const addItem = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { productId, quantity } = cartItemSchema.parse(req.body);

  const item = await cartService.addToCart(userId, productId, quantity);

  res.status(201).json(item);
};

export const updateItem = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const itemId = req.params.itemId as string;
  const { quantity } = updateCartItemSchema.parse(req.body);

  const item = await cartService.updateCartItem(userId, itemId, quantity);

  res.json(item);
};

export const removeItem = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const itemId = req.params.itemId as string;

  await cartService.removeCartItem(userId, itemId);

  res.json({ message: "Item removed from cart" });
};

export const clearCartItems = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  await cartService.clearCart(userId);

  res.json({ message: "Cart cleared" });
};
