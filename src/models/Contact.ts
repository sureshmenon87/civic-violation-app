// src/models/Contact.ts
import mongoose, { Schema } from "mongoose";

const ContactSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  org: { type: String },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ContactModel = mongoose.model("Contact", ContactSchema);
