// src/routes/categories.ts
import express from "express";
import { CategoryModel } from "../models/Category.js";

const router = express.Router();

// Public: list categories (sorted by order)
router.get("/", async (req, res) => {
  try {
    const cats = await CategoryModel.find({})
      .sort({ order: 1, title: 1 })
      .lean();
    res.json({ data: cats });
  } catch (err) {
    console.error("categories:list", err);
    res.status(500).json({ error: "Failed to load categories" });
  }
});

// Admin: create category (protect with requireAuth + isAdmin)
router.post("/", async (req, res) => {
  // TODO: require admin check in middleware
  try {
    const { key, title, description, order } = req.body;
    if (!key || !title)
      return res.status(400).json({ error: "key/title required" });
    const existing = await CategoryModel.findOne({ key });
    if (existing) return res.status(409).json({ error: "Category exists" });
    const cat = await CategoryModel.create({ key, title, description, order });
    res.status(201).json({ data: cat });
  } catch (err) {
    console.error("categories:create", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

export default router;
