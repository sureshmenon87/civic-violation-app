// src/routes/contact.ts
import express from "express";
import { ContactModel } from "../models/Contact.js";
import { z } from "zod";

const router = express.Router();

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  org: z.string().optional(),
  message: z.string().min(5),
});

router.post("/", async (req, res) => {
  try {
    const parsed = contactSchema.parse(req.body);
    const doc = await ContactModel.create(parsed);
    // TODO: optionally send email to team (using nodemailer) or create a ticket
    res.status(201).json({ ok: true, id: doc._id });
  } catch (err: any) {
    if (err?.issues) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.issues });
    }
    console.error("contact post error", err);
    res.status(500).json({ error: "Failed to store contact" });
  }
});

export default router;
