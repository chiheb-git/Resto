import { Router, IRouter } from "express";
import { eq, sql, desc, gte, and, count } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, dishesTable, tablesTable, ratingsTable } from "@workspace/db";
import { GetRevenueStatsQueryParams, GetPopularDishesQueryParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/stats/dashboard", requireAuth, requireRole("vendor", "admin"), async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayRevenue] = await db
    .select({ total: sql<number>`COALESCE(SUM(${ordersTable.totalPrice}::numeric), 0)` })
    .from(ordersTable)
    .where(and(gte(ordersTable.createdAt, today), sql`${ordersTable.status} IN ('delivered', 'paid')`));

  const [todayOrders] = await db
    .select({ cnt: count() })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, today));

  const [pendingOrders] = await db
    .select({ cnt: count() })
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"));

  const [avgRating] = await db
    .select({ avg: sql<number>`COALESCE(AVG(${ratingsTable.stars}::numeric), 0)` })
    .from(ratingsTable);

  const [totalDishes] = await db
    .select({ cnt: count() })
    .from(dishesTable)
    .where(eq(dishesTable.isAvailable, true));

  const [activeTables] = await db
    .select({ cnt: count() })
    .from(tablesTable)
    .where(eq(tablesTable.isActive, true));

  res.json({
    todayRevenue: Number(todayRevenue?.total ?? 0),
    todayOrders: Number(todayOrders?.cnt ?? 0),
    pendingOrders: Number(pendingOrders?.cnt ?? 0),
    avgRating: Number(Number(avgRating?.avg ?? 0).toFixed(1)),
    totalDishes: Number(totalDishes?.cnt ?? 0),
    activeTables: Number(activeTables?.cnt ?? 0),
  });
});

router.get("/stats/revenue", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const queryParams = GetRevenueStatsQueryParams.safeParse(req.query);
  const period = queryParams.success ? queryParams.data.period : "week";

  let truncUnit: string;
  let startDate: Date;
  const now = new Date();

  switch (period) {
    case "day":
      truncUnit = "hour";
      startDate = new Date(now);
      startDate.setHours(now.getHours() - 23, 0, 0, 0);
      break;
    case "month":
      truncUnit = "day";
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "year":
      truncUnit = "month";
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      truncUnit = "day";
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
  }

  const rows = await db
    .select({
      label: sql<string>`DATE_TRUNC('${sql.raw(truncUnit)}', ${ordersTable.createdAt})::text`,
      revenue: sql<number>`COALESCE(SUM(${ordersTable.totalPrice}::numeric), 0)`,
      orders: sql<number>`COUNT(*)`,
    })
    .from(ordersTable)
    .where(and(gte(ordersTable.createdAt, startDate), sql`${ordersTable.status} IN ('delivered', 'paid')`))
    .groupBy(sql`DATE_TRUNC('${sql.raw(truncUnit)}', ${ordersTable.createdAt})`)
    .orderBy(sql`DATE_TRUNC('${sql.raw(truncUnit)}', ${ordersTable.createdAt})`);

  res.json(rows.map((r) => ({ label: r.label, revenue: Number(r.revenue), orders: Number(r.orders) })));
});

router.get("/stats/popular-dishes", requireAuth, requireRole("admin", "vendor"), async (req, res): Promise<void> => {
  const queryParams = GetPopularDishesQueryParams.safeParse(req.query);
  const limit = queryParams.success && queryParams.data.limit ? queryParams.data.limit : 10;

  const rows = await db
    .select({
      dishId: dishesTable.id,
      nameEn: dishesTable.nameEn,
      nameFr: dishesTable.nameFr,
      nameAr: dishesTable.nameAr,
      imageUrl: dishesTable.imageUrl,
      totalOrdered: sql<number>`SUM(${orderItemsTable.quantity})`,
    })
    .from(orderItemsTable)
    .leftJoin(dishesTable, eq(orderItemsTable.dishId, dishesTable.id))
    .groupBy(dishesTable.id)
    .orderBy(desc(sql`SUM(${orderItemsTable.quantity})`))
    .limit(limit);

  res.json(rows.map((r) => ({ ...r, totalOrdered: Number(r.totalOrdered) })));
});

router.get("/stats/orders-by-status", requireAuth, requireRole("vendor", "admin"), async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await db
    .select({
      status: ordersTable.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, today))
    .groupBy(ordersTable.status);

  res.json(rows.map((r) => ({ status: r.status, count: Number(r.count) })));
});

router.get("/stats/peak-hours", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM ${ordersTable.createdAt})::int`,
      count: sql<number>`COUNT(*)`,
    })
    .from(ordersTable)
    .groupBy(sql`EXTRACT(HOUR FROM ${ordersTable.createdAt})`)
    .orderBy(sql`EXTRACT(HOUR FROM ${ordersTable.createdAt})`);

  res.json(rows.map((r) => ({ hour: Number(r.hour), count: Number(r.count) })));
});

export default router;

