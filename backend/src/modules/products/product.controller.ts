import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { createProductSchema, updateProductSchema } from "../../shared/validators";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

export const getProducts = async (req: Request, res: Response) => {
  const { category, search, featured, minPrice, maxPrice } = req.query;

  const where: any = {};

  if (category) where.categoryId = category as string;
  if (featured === "true") where.isFeatured = true;
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseInt(minPrice as string);
    if (maxPrice) where.price.lte = parseInt(maxPrice as string);
  }
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: "insensitive" } },
      { description: { contains: search as string, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(products);
};

export const getProduct = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json(product);
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  const data = createProductSchema.parse(req.body);

  const product = await prisma.product.create({ data });

  res.status(201).json(product);
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const data = updateProductSchema.parse(req.body);

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Product not found" });
  }

  const product = await prisma.product.update({ where: { id }, data });

  res.json(product);
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Product not found" });
  }

  await prisma.product.delete({ where: { id } });

  res.json({ message: "Product deleted" });
};

export const getCategories = async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  res.json(categories);
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  const { name, description, icon } = req.body;

  const category = await prisma.category.create({
    data: { name, description, icon },
  });

  res.status(201).json(category);
};
