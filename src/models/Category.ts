// src/models/Category.ts
import mongoose, { Schema } from "mongoose";

const CategorySchema = new Schema({
  key: { type: String, required: true, unique: true }, // machine key e.g. 'sanitation'
  title: { type: String, required: true }, // display title e.g. 'Sanitation'
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  order: { type: Number, default: 100 },
});

export const CategoryModel = mongoose.model("Category", CategorySchema);
