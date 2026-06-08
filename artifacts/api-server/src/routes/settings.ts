import { Router } from "express";
import { db } from "@workspace/db";
import { settings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = Router();

router.get("/:key", async (req, res) => {
  try {
    const result = await db.select().from(settings).where(eq(settings.key, req.params.key));
    if (result.length === 0) return res.json({ key: req.params.key, value: "DZD" });
    res.json(result[0]);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:key", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { value } = req.body;
    await db.insert(settings).values({ key: req.params.key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
    res.json({ key: req.params.key, value });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;