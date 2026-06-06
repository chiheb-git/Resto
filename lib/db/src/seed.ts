import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { categoriesTable, dishesTable, tablesTable, usersTable } from "./schema";

async function seedUsers() {
  const users = [
    { email: "admin@restaurant.com", password: "admin123", name: "Admin", role: "admin" as const, langPref: "en" as const },
    { email: "vendor@restaurant.com", password: "admin123", name: "Vendor", role: "vendor" as const, langPref: "en" as const },
  ];

  for (const user of users) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, user.email));
    if (existing) continue;
    const passwordHash = await bcrypt.hash(user.password, 10);
    await db.insert(usersTable).values({
      email: user.email,
      passwordHash,
      name: user.name,
      role: user.role,
      langPref: user.langPref,
    });
  }
}

async function seedCategoriesAndDishes() {
  const [existingCategory] = await db.select().from(categoriesTable).limit(1);
  if (existingCategory) return;

  const categories = [
    { nameAr: "المشروبات", nameFr: "Boissons", nameEn: "Drinks", icon: "☕", orderIndex: 0 },
    { nameAr: "المقبلات", nameFr: "Entrées", nameEn: "Starters", icon: "🍤", orderIndex: 1 },
    { nameAr: "الأطباق الرئيسية", nameFr: "Plats Principaux", nameEn: "Mains", icon: "🍽️", orderIndex: 2 },
  ];

  const insertedCategories = await Promise.all(
    categories.map((category) => db.insert(categoriesTable).values(category).returning())
  );

  const drinks = insertedCategories[0][0];
  const starters = insertedCategories[1][0];
  const mains = insertedCategories[2][0];

  const dishes = [
    {
      categoryId: drinks.id,
      nameAr: "قهوة عربية",
      nameFr: "Café Arabe",
      nameEn: "Arabic Coffee",
      descriptionAr: "قهوة عربية تقليدية مع الهيل.",
      descriptionFr: "Café arabe traditionnel au cardamome.",
      descriptionEn: "Traditional arabic coffee with cardamom.",
      price: "2.50",
      imageUrl: "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=640&q=80",
      allergens: [],
      isPopular: true,
      isNew: false,
      isAvailable: true,
    },
    {
      categoryId: starters.id,
      nameAr: "حمص",
      nameFr: "Houmous",
      nameEn: "Hummus",
      descriptionAr: "معجون حمص طازج مع زيت الزيتون.",
      descriptionFr: "Purée de pois chiches fraîche avec huile d'olive.",
      descriptionEn: "Fresh chickpea puree with olive oil.",
      price: "5.00",
      imageUrl: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=640&q=80",
      allergens: ["gluten"],
      isPopular: true,
      isNew: false,
      isAvailable: true,
    },
    {
      categoryId: mains.id,
      nameAr: "لحم مشوي",
      nameFr: "Viande Grillée",
      nameEn: "Grilled Meat",
      descriptionAr: "قطع لحم مشوية بتتبيلة خاصة.",
      descriptionFr: "Morceaux de viande grillés avec marinade maison.",
      descriptionEn: "Grilled meat pieces with special seasoning.",
      price: "12.95",
      imageUrl: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=640&q=80",
      allergens: [],
      isPopular: false,
      isNew: true,
      isAvailable: true,
    },
  ];

  await Promise.all(dishes.map((dish) => db.insert(dishesTable).values(dish)));
}

async function seedTables() {
  const [existingTable] = await db.select().from(tablesTable).limit(1);
  if (existingTable) return;

  const tables = [1, 2, 3, 4, 5].map((number) => ({ number, qrToken: randomUUID() }));
  await Promise.all(tables.map((table) => db.insert(tablesTable).values(table)));
}

async function main() {
  console.log("Seeding database...");
  await seedUsers();
  await seedCategoriesAndDishes();
  await seedTables();
  console.log("Seed completed.");
  process.exit(0);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
