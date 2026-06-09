import { Router, IRouter } from "express";
import { eq, and, desc, gte, lte, sql, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, dishesTable, tablesTable, ratingsTable } from "@workspace/db";
import {
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  GetActiveOrderByTableParams,
  ListOrdersQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { getSocketServer } from "../lib/socket";

const router: IRouter = Router();

async function buildOrderResponse(order: typeof ordersTable.$inferSelect) {
  const items = await db
    .select({
      id: orderItemsTable.id,
      dishId: orderItemsTable.dishId,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      customNote: orderItemsTable.customNote,
      dish: {
        id: dishesTable.id,
        categoryId: dishesTable.categoryId,
        nameAr: dishesTable.nameAr,
        nameFr: dishesTable.nameFr,
        nameEn: dishesTable.nameEn,
        descriptionAr: dishesTable.descriptionAr,
        descriptionFr: dishesTable.descriptionFr,
        descriptionEn: dishesTable.descriptionEn,
        price: dishesTable.price,
        imageUrl: dishesTable.imageUrl,
        allergens: dishesTable.allergens,
        isPopular: dishesTable.isPopular,
        isNew: dishesTable.isNew,
        isAvailable: dishesTable.isAvailable,
      },
    })
    .from(orderItemsTable)
    .leftJoin(dishesTable, eq(orderItemsTable.dishId, dishesTable.id))
    .where(eq(orderItemsTable.orderId, order.id));

  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, order.tableId));

  const [rating] = await db.select().from(ratingsTable).where(eq(ratingsTable.orderId, order.id));

  return {
    ...order,
    totalPrice: Number(order.totalPrice),
    table: table ? { ...table, status: "free" } : null,
    items: items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      dish: i.dish ? { ...i.dish, price: Number(i.dish.price) } : null,
    })),
    rating: rating ?? null,
  };
}

router.get("/orders", requireAuth, requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const queryParams = ListOrdersQueryParams.safeParse(req.query);
  const params = queryParams.success ? queryParams.data : {};

  const conditions = [];
  if (params.status) {
    conditions.push(eq(ordersTable.status, params.status as "pending" | "confirmed" | "refused" | "ready" | "delivered"));
  }
  if (params.tableId) {
    conditions.push(eq(ordersTable.tableId, params.tableId));
  }
  if (params.date) {
    const start = new Date(params.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(params.date);
    end.setHours(23, 59, 59, 999);
    conditions.push(gte(ordersTable.createdAt, start));
    conditions.push(lte(ordersTable.createdAt, end));
  }

  let query = db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).$dynamic();
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  if (params.limit) {
    query = query.limit(params.limit);
  }
  if (params.offset) {
    query = query.offset(params.offset);
  }

  const orders = await query;
  const result = await Promise.all(orders.map(buildOrderResponse));
  res.json(result);
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { tableId, note, items } = parsed.data;

  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, tableId));
  if (!table || !table.isActive) {
    res.status(400).json({ error: "Table not found or inactive" });
    return;
  }

  let totalPrice = 0;
  const dishIds = items.map((i) => i.dishId);
  const dishes = await db
    .select()
    .from(dishesTable)
    .where(inArray(dishesTable.id, dishIds));

  const dishMap = new Map(dishes.map((d) => [d.id, d]));
  for (const item of items) {
    const dish = dishMap.get(item.dishId);
    if (!dish) {
      res.status(400).json({ error: `Dish ${item.dishId} not found` });
      return;
    }
    if (!dish.isAvailable) {
      res.status(400).json({ error: `Dish ${dish.nameEn} is not available` });
      return;
    }
    const itemPrice = (item.customNote?.includes('[Grande]') && (dish as any).priceLarge != null) ? Number((dish as any).priceLarge) : Number(dish.price);
    totalPrice += itemPrice * item.quantity;
  }

  const [order] = await db
    .insert(ordersTable)
    .values({ tableId, note: note ?? null, totalPrice: String(totalPrice) })
    .returning();

  for (const item of items) {
    const dish = dishMap.get(item.dishId)!;
    const itemPrice = (item.customNote?.includes('[Grande]') && (dish as any).priceLarge != null) ? Number((dish as any).priceLarge) : Number(dish.price);
    await db.insert(orderItemsTable).values({
      orderId: order.id,
      dishId: item.dishId,
      quantity: item.quantity,
      unitPrice: String(itemPrice),
      customNote: item.customNote ?? null,
    });
  }

  const full = await buildOrderResponse(order);
  const io = getSocketServer();
  if (io) {
    io.to("vendors").emit("vendor:new-order", full);
    io.to(`order:${order.id}`).emit("order:updated", full);
  }

  res.status(201).json(full);
});

router.get("/orders/table/:tableId/active", async (req, res): Promise<void> => {
  const params = GetActiveOrderByTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.tableId, params.data.tableId),
        sql`${ordersTable.status} NOT IN ('delivered', 'refused')`
      )
    )
    .orderBy(desc(ordersTable.createdAt))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "No active order found" });
    return;
  }
  const full = await buildOrderResponse(order);
  res.json(full);
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const full = await buildOrderResponse(order);
  res.json(full);
});

router.patch("/orders/:id/status", requireAuth, requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.refusalReason) {
    updateData.refusalReason = parsed.data.refusalReason;
  }
  const [order] = await db
    .update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, params.data.id))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const full = await buildOrderResponse(order);
  const io = getSocketServer();
  if (io) {
    io.to("vendors").emit("order:updated", full);
    io.to(`order:${order.id}`).emit("order:updated", full);
  }
  res.json(full);
});

export default router;


