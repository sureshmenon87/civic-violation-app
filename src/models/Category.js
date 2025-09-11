"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryModel = void 0;
// src/models/Category.ts
var mongoose_1 = require("mongoose");
var CategorySchema = new mongoose_1.Schema({
    key: { type: String, required: true, unique: true }, // machine key e.g. 'sanitation'
    title: { type: String, required: true }, // display title e.g. 'Sanitation'
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    order: { type: Number, default: 100 },
});
exports.CategoryModel = mongoose_1.default.model("Category", CategorySchema);
