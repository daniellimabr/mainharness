import { Router } from "express";
import { db } from "../db";

export const orders = Router();

// GET /api/orders -> every order, newest first.
orders.get("/", async (_req, res) => {
  res.json(await db.order.findMany({ orderBy: { createdAt: "desc" } }));
});
