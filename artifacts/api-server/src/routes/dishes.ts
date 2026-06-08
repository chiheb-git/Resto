import { Router, IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { getSocketServer } from "../lib/socket.js";
import { db, dishesTable } from "@workspace/db";
import {
  ListDishesResponseItem,
  CreateDishBody,
  GetDishParams,
  UpdateDishParams,
  UpdateDishBody,
  DeleteDishParams,
  ToggleDishAvailabilityParams,
  ListDishesQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dishes", async (req, res): Promise<void> => {
  const queryParams = ListDishesQueryParams.safeParse(req.query);
  const params = queryParams.success ? queryParams.data : {};

  let query = db.select().from(dishesTable).$dynamic();

  const conditions = [];
  if (params.categoryId !== undefined) {
    conditions.push(eq(dishesTable.categoryId, params.categoryId));
  }
  if (params.available !== undefined) {
    conditions.push(eq(dishesTable.isAvailable, params.available));
  }
  if (params.search) {
    conditions.push(ilike(dishesTable.nameEn, `%${params.search}%`));
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const dishes = await query;
  res.json(dishes.map((d) => ListDishesResponseItem.parse({ ...d, price: Number(d.price) })));
});

router.post("/dishes", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateDishBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [dish] = await db
    .insert(dishesTable)
    .values({ ...parsed.data, price: String(parsed.data.price) })
    .returning();
  const io1 = getSocketServer(); if (io1) io1.emit("menu:updated", { type: "dish:created" });
  res.status(201).json(ListDishesResponseItem.parse({ ...dish, price: Number(dish.price) }));
});

router.get("/dishes/:id", async (req, res): Promise<void> => {
  const params = GetDishParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [dish] = await db.select().from(dishesTable).where(eq(dishesTable.id, params.data.id));
  if (!dish) {
    res.status(404).json({ error: "Dish not found" });
    return;
  }
  const io2 = getSocketServer(); if (io2) io2.emit("menu:updated", { type: "dish:updated" });
  res.json(ListDishesResponseItem.parse({ ...dish, price: Number(dish.price) }));
});

router.patch("/dishes/:id", requireAuth, requireRole("admin", "vendor"), async (req, res): Promise<void> => {
  const params = UpdateDishParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDishBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price !== undefined) {
    updateData.price = String(parsed.data.price);
  }
  const [dish] = await db
    .update(dishesTable)
    .set(updateData)
    .where(eq(dishesTable.id, params.data.id))
    .returning();
  if (!dish) {
    res.status(404).json({ error: "Dish not found" });
    return;
  }
  const io2 = getSocketServer(); if (io2) io2.emit("menu:updated", { type: "dish:updated" });
  res.json(ListDishesResponseItem.parse({ ...dish, price: Number(dish.price) }));
});

router.delete("/dishes/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteDishParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [dish] = await db.delete(dishesTable).where(eq(dishesTable.id, params.data.id)).returning();
  if (!dish) {
    res.status(404).json({ error: "Dish not found" });
    return;
  }
  const io3 = getSocketServer(); if (io3) io3.emit("menu:updated", { type: "dish:deleted" });
  res.json({ success: true });
});

router.patch("/dishes/:id/toggle-availability", requireAuth, requireRole("admin", "vendor"), async (req, res): Promise<void> => {
  const params = ToggleDishAvailabilityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db.select().from(dishesTable).where(eq(dishesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Dish not found" });
    return;
  }
  const [dish] = await db
    .update(dishesTable)
    .set({ isAvailable: !existing.isAvailable })
    .where(eq(dishesTable.id, params.data.id))
    .returning();
  const io2 = getSocketServer(); if (io2) io2.emit("menu:updated", { type: "dish:updated" });
  res.json(ListDishesResponseItem.parse({ ...dish, price: Number(dish.price) }));
});

export default router;
