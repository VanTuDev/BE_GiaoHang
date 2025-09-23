import mongoose from "mongoose";

// Người dùng chung cho hệ thống (Customer, Driver, Admin)
const userSchema = new mongoose.Schema({
   name: { type: String, required: true },
   email: { type: String, unique: true, lowercase: true, trim: true },
   phone: { type: String, unique: true, required: true },
   passwordHash: { type: String, required: true },
   role: { type: String, enum: ["Customer", "Driver", "Admin"], default: "Customer" },
   roles: { type: [{ type: String, enum: ["Customer", "Driver", "Admin"] }], default: ["Customer"] },
   address: { type: String, default: "Đà Nẵng" },
   isEmailVerified: { type: Boolean, default: false },
   avatarUrl: { type: String },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
