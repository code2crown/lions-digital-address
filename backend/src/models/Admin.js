const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
  name: { type: String, default: "Admin" },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["superadmin", "admin"], default: "admin" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Admin", AdminSchema);
