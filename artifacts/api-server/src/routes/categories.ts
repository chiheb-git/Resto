import { Router, IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { getSocketServer } from "../lib/socket.js";
import { db, categoriesTable } from "@workspace/db";
import {
  ListCategoriesResponseItem,
  CreateCategoryBody,
  GetCategoryParams,
  UpdateCategoryParams,
  UpdateCategoryBody,
  DeleteCategoryParams,
  ReorderCategoriesBody,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/categories", async (req, res): Promise<void> => {
  const includeInactive = req.query.includeInactive === "true";
  const rows = await db
    .select()
    .from(categoriesTable)
    .orderBy(asc(categoriesTable.orderIndex));
  const filtered = includeInactive ? rows : rows.filter((c) => c.isActive);
  res.json(filtered.map((c) => ListCategoriesResponseItem.parse(c)));
});

router.post("/categories", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cat] = await db.insert(categoriesTable).values(parsed.data).returning();
  const ioC1 = getSocketServer(); if (ioC1) ioC1.emit("menu:updated", { type: "category:created" });
  res.status(201).json(ListCategoriesResponseItem.parse(cat));
});

router.get("/categories/reorder", (_req, res): void => {
  const ioC2 = getSocketServer(); if (ioC2) ioC2.emit("menu:updated", { type: "category:updated" });
  res.json({ success: true });
});

router.patch("/categories/reorder", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = ReorderCategoriesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  for (const item of parsed.data.items) {
    await db
      .update(categoriesTable)
      .set({ orderIndex: item.orderIndex })
      .where(eq(categoriesTable.id, item.id));
  }
  const ioC2 = getSocketServer(); if (ioC2) ioC2.emit("menu:updated", { type: "category:updated" });
  res.json({ success: true });
});

router.get("/categories/:id", async (req, res): Promise<void> => {
  const params = GetCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, params.data.id));
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json(ListCategoriesResponseItem.parse(cat));
});

router.patch("/categories/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cat] = await db
    .update(categoriesTable)
    .set(parsed.data)
    .where(eq(categoriesTable.id, params.data.id))
    .returning();
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json(ListCategoriesResponseItem.parse(cat));
});

router.delete("/categories/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [cat] = await db.delete(categoriesTable).where(eq(categoriesTable.id, params.data.id)).returning();
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  const ioC2 = getSocketServer(); if (ioC2) ioC2.emit("menu:updated", { type: "category:updated" });
  res.json({ success: true });
});

export default router;
