import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { registerSchema, loginSchema, refreshTokenSchema } from "../../shared/validators";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";

const generateTokens = (userId: string, role: string) => {
  const payload = { id: userId, role };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: ACCESS_EXPIRES,
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: REFRESH_EXPIRES,
  });

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response) => {
  const { name, phone, password } = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return res.status(409).json({ message: "Phone number already registered" });
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, phone, password: hashed },
  });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    accessToken,
  });
};

export const login = async (req: Request, res: Response) => {
  const { phone, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return res.status(401).json({ message: "Invalid phone number or password" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ message: "Invalid phone number or password" });
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    accessToken,
  });
};

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = refreshTokenSchema.parse(req.body);

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as {
      id: string;
      role: string;
    };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const tokens = generateTokens(user.id, user.role);
    res.json({ accessToken: tokens.accessToken });
  } catch {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, phone: true, role: true, createdAt: true },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
};
