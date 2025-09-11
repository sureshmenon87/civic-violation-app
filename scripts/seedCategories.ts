// scripts/seedCategoriesAndReports.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { CategoryModel } from "../src/models/Category.js";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const categories = [
    { key: "roads", title: "Roads" },
    { key: "sanitation", title: "Sanitation" },
    { key: "lighting", title: "Street Lighting" },
    { key: "water", title: "Water" },
    { key: "other", title: "Other" },
  ];

  for (const c of categories) {
    await CategoryModel.updateOne(
      { key: c.key },
      { $set: c },
      { upsert: true }
    );
  }
  console.log("Categories seeded.");

  await mongoose.disconnect();
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
