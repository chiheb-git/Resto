import { Router, IRouter } from "express";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getSocketServer } from "../lib/socket.js";
import { db, tablesTable, ordersTable, orderItemsTable } from "@workspace/db";
import {
  ListTablesResponseItem,
  CreateTableBody,
  GetTableParams,
  UpdateTableParams,
  UpdateTableBody,
  DeleteTableParams,
  GetTableByTokenParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

async function getTableStatus(tableId: number): Promise<"free" | "occupied" | "waiting"> {
  const activeOrders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.tableId, tableId));
  const active = activeOrders.filter((o) => !["delivered", "refused", "paid"].includes(o.status));
  if (active.length === 0) return "free";
  const hasPending = active.some((o) => o.status === "pending");
  if (hasPending) return "waiting";
  return "occupied";
}

router.get("/tables", requireAuth, async (req, res): Promise<void> => {
  const tables = await db.select().from(tablesTable).orderBy(tablesTable.number);
  const withStatus = await Promise.all(
    tables.map(async (t) => {
      const status = await getTableStatus(t.id);
      return ListTablesResponseItem.parse({ ...t, status });
    })
  );
  res.json(withStatus);
});

router.post("/tables", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateTableBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const qrToken = randomUUID();
  const [table] = await db
    .insert(tablesTable)
    .values({ number: parsed.data.number, qrToken })
    .returning();
  const ioT1 = getSocketServer(); if (ioT1) ioT1.emit("tables:updated", { type: "table:created" });
  res.status(201).json(ListTablesResponseItem.parse({ ...table, status: "free" }));
});

router.get("/tables/by-token/:token", async (req, res): Promise<void> => {
  const params = GetTableByTokenParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [table] = await db
    .select()
    .from(tablesTable)
    .where(eq(tablesTable.qrToken, params.data.token));
  if (!table || !table.isActive) {
    res.status(404).json({ error: "Table not found or inactive" });
    return;
  }
  const status = await getTableStatus(table.id);
  res.json(ListTablesResponseItem.parse({ ...table, status }));
});

router.get("/tables/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, params.data.id));
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  const status = await getTableStatus(table.id);
  res.json(ListTablesResponseItem.parse({ ...table, status }));
});

router.patch("/tables/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTableBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [table] = await db
    .update(tablesTable)
    .set(parsed.data)
    .where(eq(tablesTable.id, params.data.id))
    .returning();
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  const status = await getTableStatus(table.id);
  res.json(ListTablesResponseItem.parse({ ...table, status }));
});

router.delete("/tables/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(orderItemsTable).where(
    eq(orderItemsTable.orderId, 
      db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.tableId, params.data.id)).limit(1)
    )
  );
  await db.delete(ordersTable).where(eq(ordersTable.tableId, params.data.id));
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.tableId, params.data.id));
  for (const order of orders) {
    await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  }
  await db.delete(ordersTable).where(eq(ordersTable.tableId, params.data.id));
  const [table] = await db.delete(tablesTable).where(eq(tablesTable.id, params.data.id)).returning();
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  res.json({ success: true });
});
export default router;



