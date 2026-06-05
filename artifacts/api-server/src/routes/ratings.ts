import { Router, IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, ratingsTable, ordersTable } from "@workspace/db";
import { CreateRatingBody, ListRatingsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/ratings", async (req, res): Promise<void> => {
  const queryParams = ListRatingsQueryParams.safeParse(req.query);
  const params = queryParams.success ? queryParams.data : {};

  let query = db.select().from(ratingsTable).orderBy(desc(ratingsTable.createdAt)).$dynamic();
  if (params.limit) {
    query = query.limit(params.limit);
  }
  const ratings = await query;
  res.json(ratings);
});

router.post("/ratings", async (req, res): Promise<void> => {
  const parsed = CreateRatingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, parsed.data.orderId));
  if (!order) {
    res.status(400).json({ error: "Order not found" });
    return;
  }
  if (order.status !== "delivered") {
    res.status(400).json({ error: "Can only rate delivered orders" });
    return;
  }
  const [existing] = await db.select().from(ratingsTable).where(eq(ratingsTable.orderId, parsed.data.orderId));
  if (existing) {
    res.status(400).json({ error: "Order already rated" });
    return;
  }
  const [rating] = await db
    .insert(ratingsTable)
    .values({ orderId: parsed.data.orderId, stars: parsed.data.stars, comment: parsed.data.comment ?? null })
    .returning();
  res.status(201).json(rating);
});

export default router;
