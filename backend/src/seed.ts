import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding database...");

  // Check if admin exists
  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    console.log("✅ Admin user already exists");
  } else {
    const hashedPassword = await bcrypt.hash("admin123", 12);

    const admin = await prisma.user.create({
      data: {
        name: "Bale Robe Admin",
        phone: "+251900000000",
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    console.log(`✅ Admin created: ${admin.name} (${admin.phone})`);
  }

  // Seed categories
  const categories = [
    { name: "Phone Cases", description: "Protective cases for all phones", icon: "smartphone" },
    { name: "Chargers", description: "Wall chargers, car chargers, cables", icon: "zap" },
    { name: "Earphones", description: "Wired and wireless earphones", icon: "headphones" },
    { name: "Screen Protectors", description: "Tempered glass and film protectors", icon: "shield" },
    { name: "Power Banks", description: "Portable batteries", icon: "battery-charging" },
    { name: "Phone Holders", description: "Car mounts and desk stands", icon: "monitor" },
  ];

  for (const cat of categories) {
    const exists = await prisma.category.findFirst({ where: { name: cat.name } });
    if (!exists) {
      await prisma.category.create({ data: cat });
      console.log(`✅ Category: ${cat.name}`);
    }
  }

  // Seed sample products
  const cats = await prisma.category.findMany();
  const caseCat = cats.find(c => c.name === "Phone Cases");
  const chargerCat = cats.find(c => c.name === "Chargers");
  const earphoneCat = cats.find(c => c.name === "Earphones");
  const screenCat = cats.find(c => c.name === "Screen Protectors");
  const powerCat = cats.find(c => c.name === "Power Banks");

  const products = [
    { name: "iPhone 15 Pro Silicone Case", description: "Official silicone case - soft touch", price: 1500, stock: 50, categoryId: caseCat?.id },
    { name: "Samsung Galaxy S24 Clear Case", description: "Transparent shockproof case", price: 1200, stock: 40, categoryId: caseCat?.id },
    { name: "USB-C Fast Charger 65W", description: "GaN fast charger with cable", price: 2500, stock: 30, categoryId: chargerCat?.id },
    { name: "Wireless Earbuds TWS", description: "Bluetooth 5.3 with noise cancellation", price: 3500, stock: 20, categoryId: earphoneCat?.id },
    { name: "Tempered Glass iPhone 15", description: "9H hardness, anti-fingerprint", price: 500, stock: 100, categoryId: screenCat?.id },
    { name: "Power Bank 20000mAh", description: "Fast charging PD 65W", price: 4500, stock: 15, categoryId: powerCat?.id },
    { name: "Car Phone Mount Magnetic", description: "MagSafe compatible dashboard mount", price: 1800, stock: 25, categoryId: null },
    { name: "Anker USB-C Cable 2m", description: "Braided nylon, 100W PD", price: 800, stock: 60, categoryId: chargerCat?.id },
  ];

  for (const prod of products) {
    const exists = await prisma.product.findFirst({ where: { name: prod.name } });
    if (!exists) {
      await prisma.product.create({ data: prod });
      console.log(`✅ Product: ${prod.name}`);
    }
  }

  console.log("\n🎉 Database seeded successfully!");
  console.log("\n📋 Admin Credentials:");
  console.log("   Phone: +251900000000");
  console.log("   Password: admin123");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
